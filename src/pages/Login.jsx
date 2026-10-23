import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

function Login({ onLogin, showToast }) {
  const navigate = useNavigate()
  const [role, setRole] = useState(() => 'student')
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [adminCategory, setAdminCategory] = useState('Electrical')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAccessCode, setShowAccessCode] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isStudentRole = role === 'student'
  const isAdminRole = role === 'admin'

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    setError('')
    setIsSubmitting(true)
    const cleanEmail = email.trim().toLowerCase()

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please try again.')
        setIsSubmitting(false)
        return
      }

      try {
        await api.signup({
          email: cleanEmail,
          password,
          role,
          accessCode: role === 'admin' ? accessCode : '',
          adminCategory: role === 'admin' ? adminCategory : undefined
        })
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        setAccessCode('')
        showToast('Account created! Please log in to continue.')
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    try {
      const authResponse = await api.login({
        email: cleanEmail,
        password,
        role,
        accessCode: role === 'admin' ? accessCode : ''
      })
      onLogin(authResponse)
      showToast('Welcome to GDC Ganderbal CampusFix!')
      navigate(role === 'admin' ? '/admin' : '/home')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleName = role === 'admin' ? 'Administrator' : 'Student'

  return (
    <main className="page login-page">
      <div className="form-wrap">
        <h1 className="login-title">{mode === 'signup' ? `Create ${roleName.toLowerCase()} account` : `${roleName} log in`}</h1>
        <p className="login-subtitle">
          {mode === 'signup'
            ? 'Create your account to access GDC Ganderbal CampusFix.'
            : role === 'admin'
            ? 'Review, assign, and resolve campus reports.'
            : 'Report and follow up on campus issues.'}
        </p>

        <div className="role-toggle" key={role}>
          <button
            type="button"
            className={isStudentRole ? 'ghost selected' : 'ghost'}
            onClick={() => setRole('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={isAdminRole ? 'ghost selected' : 'ghost'}
            onClick={() => setRole('admin')}
          >
            Administrator
          </button>
        </div>

        {error && <p className="error-text login-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="full">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label className="full">
            Password
            <span className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                className={showPassword ? 'password-toggle is-visible' : 'password-toggle'}
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onPointerDown={(e) => {
                  e.preventDefault()
                  setShowPassword((visible) => !visible)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setShowPassword((visible) => !visible)
                  }
                }}
              />
            </span>
          </label>

          {role === 'admin' && (
            <label className="full">
              Administrator access code
              <span className="password-input-wrap">
                <input
                  type={showAccessCode ? 'text' : 'password'}
                  placeholder="DCE-ADMIN-2026"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                />
                <button
                  className={showAccessCode ? 'password-toggle is-visible' : 'password-toggle'}
                  type="button"
                  aria-label={showAccessCode ? 'Hide access code' : 'Show access code'}
                  title={showAccessCode ? 'Hide access code' : 'Show access code'}
                  aria-pressed={showAccessCode}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setShowAccessCode((visible) => !visible)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setShowAccessCode((visible) => !visible)
                    }
                  }}
                />
              </span>
              <small style={{ display: 'block', marginTop: '6px', fontSize: '13px', color: '#64748b', opacity: 0.9 }}>
                Admin access code: <strong>DCE-ADMIN-2026</strong>
              </small>
            </label>
          )}

          {mode === 'signup' && role === 'admin' && (
            <label className="full">
              Issue category managed by this administrator
              <select value={adminCategory} onChange={(e) => setAdminCategory(e.target.value)}>
                <option>Electrical</option>
                <option>Plumbing</option>
                <option>Furniture</option>
                <option>Cleanliness</option>
                <option>Internet/Wi-Fi</option>
                <option>Safety</option>
                <option>Other</option>
              </select>
            </label>
          )}

          {mode === 'signup' && (
            <label className="full">
              Confirm password
              <span className="password-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  className={showConfirmPassword ? 'password-toggle is-visible' : 'password-toggle'}
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                  title={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                  aria-pressed={showConfirmPassword}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setShowConfirmPassword((visible) => !visible)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setShowConfirmPassword((visible) => !visible)
                    }
                  }}
                />
              </span>
            </label>
          )}

          <button className="primary full submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="button-loading"><span /> Working...</span> : mode === 'signup' ? `Create ${roleName} Account` : `Log in as ${roleName}`}
          </button>
        </form>

        <p className="account-switch">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button className="link-button" type="button" onClick={() => setMode('login')}>Log in</button>
            </>
          ) : (
            <>
              New to CampusFix?{' '}
              <button className="link-button" type="button" onClick={() => setMode('signup')}>Create an account</button>
            </>
          )}
        </p>
      </div>
    </main>
  )
}

export default Login
