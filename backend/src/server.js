import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import authRoutes from './routes/authRoutes.js'
import issueRoutes from './routes/issueRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import donationRoutes from './routes/donationRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { startCleanupJob } from './jobs/cleanup.js'
import { getDb } from './lib/mongo.js'

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) throw new Error('DATABASE_URL and JWT_SECRET are required.')

const app = express()
const port = process.env.PORT || 4000
const uploadPath = path.resolve('uploads')
fs.mkdirSync(uploadPath, { recursive: true })


const allowedOrigins = new Set([
	process.env.CLIENT_ORIGIN,
	process.env.PUBLIC_APP_URL,
	'http://localhost:5173',
	'http://localhost:5174',
	'http://127.0.0.1:5173',
	'http://127.0.0.1:5174'
].filter(Boolean))

function isPrivateNetworkHost(hostname) {
	if (!hostname) return false
	const host = hostname.toLowerCase()
	if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
	if (host.startsWith('192.168.')) return true
	if (host.startsWith('10.')) return true
	if (host.startsWith('172.')) {
		const second = Number(host.split('.')[1])
		return second >= 16 && second <= 31
	}
	return false
}

app.use(cors({ origin: (origin, callback) => {
	if (!origin) return callback(null, true)
	if (allowedOrigins.has(origin)) return callback(null, true)
	try {
		const url = new URL(origin)
		if (isPrivateNetworkHost(url.hostname)) return callback(null, true)
	} catch {
		// Ignore malformed origin strings.
	}
	if (process.env.NODE_ENV !== 'production') return callback(null, true)
	return callback(new Error('Origin is not allowed by CORS.'))
} }))
app.use(express.json())
app.use('/uploads', express.static(uploadPath))
app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/issues', issueRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/donations', donationRoutes)
app.use('/api/notifications', notificationRoutes)
app.use(errorHandler)

try {
	await getDb()
	app.listen(port, '0.0.0.0', () => console.log(`CampusFix API listening on port ${port}`))
	startCleanupJob()
} catch (error) {
	console.error('MongoDB connection failed:', error)
	process.exitCode = 1
}