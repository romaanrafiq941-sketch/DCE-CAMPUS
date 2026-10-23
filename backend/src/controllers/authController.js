import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { getDb, serializeUser } from '../lib/mongo.js'
import { adminCategorySchema, loginSchema, parseBody, signupSchema } from '../utils/validation.js'

const maxAdminsPerCategory = Number(process.env.ADMIN_CATEGORY_LIMIT || 3)
const defaultAdminAccessCode = 'DCE-ADMIN-2026'
const legacyAdminAccessCode = 'GDC-ADMIN-2026'
const expectedAdminAccessCode = normalizeAccessCode(process.env.ADMIN_ACCESS_CODE || defaultAdminAccessCode)
const validAdminCodes = new Set([expectedAdminAccessCode, normalizeAccessCode(legacyAdminAccessCode)])

function normalizeAccessCode(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, '').toUpperCase()
}

function accessCodeMatchesAdmin(submittedCode) {
  const normalizedSubmittedCode = normalizeAccessCode(submittedCode)
  return validAdminCodes.has(normalizedSubmittedCode)
}

async function ensureCategoryCapacity(collection, adminCategory, excludedUserId = null) {
  const query = { role: 'admin', adminCategory }
  if (excludedUserId) query._id = { $ne: excludedUserId }
  const adminCount = await collection.countDocuments(query)
  if (adminCount >= maxAdminsPerCategory) {
    const error = new Error(`${adminCategory} already has the maximum of ${maxAdminsPerCategory} administrators.`)
    error.statusCode = 409
    throw error
  }
}

export async function signup(req, res, next) {
  try {
    const data = parseBody(signupSchema, req.body)
    if (data.role === 'admin' && !accessCodeMatchesAdmin(data.accessCode)) {
      const error = new Error('The administrator access code is incorrect.')
      error.statusCode = 401
      throw error
    }
    if (data.role === 'admin' && !data.adminCategory) {
      const error = new Error('Please choose the issue category this administrator manages.')
      error.statusCode = 400
      throw error
    }
    const email = data.email.toLowerCase()
    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = {
      email,
      passwordHash,
      role: data.role,
      ...(data.role === 'admin' ? { adminCategory: data.adminCategory } : {}),
      createdAt: new Date()
    }
    const collection = (await getDb()).collection('users')
    if (data.role === 'admin') await ensureCategoryCapacity(collection, data.adminCategory)
    const result = await collection.insertOne(user)
    res.status(201).json({ user: serializeUser({ ...user, _id: result.insertedId }) })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const data = parseBody(loginSchema, req.body)
    const user = await (await getDb()).collection('users').findOne({ email: data.email.toLowerCase() })
    const validPassword = user && await bcrypt.compare(data.password, user.passwordHash)
    const validAdminCode = data.role !== 'admin' || accessCodeMatchesAdmin(data.accessCode)
    const valid = validPassword && user.role === data.role && validAdminCode
    if (!valid) return res.status(401).json({ error: 'Incorrect email, password, access code, or account role.' })

    const token = jwt.sign({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      adminCategory: user.adminCategory || null
    }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: serializeUser(user) })
  } catch (error) {
    next(error)
  }
}

export async function updateAdminCategory(req, res, next) {
  try {
    const { adminCategory } = parseBody(adminCategorySchema, req.body)
    const collection = (await getDb()).collection('users')
    await ensureCategoryCapacity(collection, adminCategory, new ObjectId(req.user.id))
    const user = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.user.id), role: 'admin' },
      { $set: { adminCategory } },
      { returnDocument: 'after' }
    )
    if (!user) return res.status(404).json({ error: 'Administrator account was not found.' })
    const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role, adminCategory }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: serializeUser(user) })
  } catch (error) {
    next(error)
  }
}
