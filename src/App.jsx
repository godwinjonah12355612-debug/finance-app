import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // PROFILE
  const [profileName, setProfileName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [balance, setBalance] = useState(0)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // AUTH
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  // APPROVAL
  const [approved, setApproved] = useState(false)
  const [checkingApproval, setCheckingApproval] = useState(false)

  // PAGES
  const [activePage, setActivePage] = useState('dashboard')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // SUPPORT
  const [supportMessage, setSupportMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messages, setMessages] = useState([])

  // DEMO WALLET
  const walletAddress =
    'bc1qwx90w9s588gyev4qrw45fe57gq5pwrhctte8f2'

  // --------------------------------------------------
  // ACCOUNTS
  // --------------------------------------------------

  const accounts = [
    {
      name: 'Checking Account',
      number: '•••• 4821',
      balance: Number(balance),
      icon: '▣',
    },
    {
      name: 'Savings Account',
      number: '•••• 7534',
      balance: 12890.50,
      icon: '🐷',
    },
    {
      name: 'Business Account',
      number: '•••• 9912',
      balance: 8200.75,
      icon: '💼',
    },
  ]

  // --------------------------------------------------
  // DEMO TRANSACTIONS
  // --------------------------------------------------

  const transactions = [
    {
      title: 'Amazon Shopping',
      date: 'May 12, 2026 • 10:24 AM',
      amount: '-$84.20',
      type: 'out',
      icon: 'a',
    },
    {
      title: 'Salary Deposit',
      date: 'May 10, 2026 • 09:00 AM',
      amount: '+$3,500.00',
      type: 'in',
      icon: '↓',
    },
    {
      title: 'Electricity Bill',
      date: 'May 8, 2026 • 04:45 PM',
      amount: '-$120.00',
      type: 'out',
      icon: 'ϟ',
    },
    {
      title: 'Transfer to Savings',
      date: 'May 7, 2026 • 11:15 AM',
      amount: '-$500.00',
      type: 'out',
      icon: '↔️',
    },
    {
      title: 'Netflix Subscription',
      date: 'May 5, 2026 • 08:30 PM',
      amount: '-$15.99',
      type: 'out',
      icon: 'N',
    },
  ]

  // --------------------------------------------------
  // FORMAT BALANCE
  // --------------------------------------------------

  function formatBalance(value) {
    return Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // --------------------------------------------------
  // SESSION
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
  // LOAD PROFILE + BALANCE
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      if (!session?.user?.id) {
        setProfileName('')
        setAvatarUrl('')
        setBalance(0)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, balance')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        console.error('Profile loading error:', error)
        return
      }

      setProfileName(
        typeof data?.display_name === 'string'
          ? data.display_name.trim()
          : ''
      )

      setAvatarUrl(
        typeof data?.avatar_url === 'string'
          ? data.avatar_url
          : ''
      )

      setBalance(
        typeof data?.balance === 'number'
          ? data.balance
          : Number(data?.balance || 0)
      )
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [session?.user?.id])

  // --------------------------------------------------
  // APPROVAL
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
  // PROFILE PICTURE
  // --------------------------------------------------

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]

    if (!file || !session?.user?.id) return

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image smaller than 5MB.')
      return
    }

    setUploadingAvatar(true)

    try {
      const userId = session.user.id

      const extension =
        file.name.split('.').pop() || 'jpg'

      const filePath =
        `${userId}/avatar-${Date.now()}.${extension}`

      const { error: uploadError } =
        await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: profileError } =
        await supabase
          .from('profiles')
          .update({
            avatar_url: publicUrl,
          })
          .eq('id', userId)

      if (profileError) {
        throw profileError
      }

      setAvatarUrl(publicUrl)
      setShowProfileMenu(false)

      alert('Profile picture updated successfully!')
    } catch (error) {
      console.error('Avatar upload error:', error)

      alert(
        error.message ||
          'Unable to upload your profile picture.'
      )
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
  }

  // --------------------------------------------------
  // SUPPORT MESSAGES
  // --------------------------------------------------

  async function loadMessages() {
    if (!session?.user?.id) return

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
    if (
      !session?.user?.id ||
      !approved
    ) {
      setMessages([])
      return
    }

    loadMessages()

    const interval = setInterval(() => {
      loadMessages()
    }, 3000)

    return () => clearInterval(interval)
  }, [session?.user?.id, approved])

  async function handleSendMessage() {
    const message = supportMessage.trim()

    if (!message || !session?.user?.id) return

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
      console.error('Message error:', error)

      setMessages((previous) =>
        previous.filter(
          (item) =>
            item.id !== temporaryMessage.id
        )
      )

      setSupportMessage(message)
      setSendingMessage(false)

      alert('Unable to send your message.')
      return
    }

    setMessages((previous) =>
      previous.map((item) =>
        item.id === temporaryMessage.id
          ? data
          : item
      )
    )

    try {
      await supabase.functions.invoke(
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
    } catch (error) {
      console.error(
        'Telegram notification error:',
        error
      )
    }

    setSendingMessage(false)
  }

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
      setAuthMessage(error.message)
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

    const { data, error } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

    setAuthLoading(false)

    if (error) {
      setAuthMessage(error.message)
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
        'Account created. Please check your email to confirm your account.'
      )

      setAuthMode('login')
      setPassword('')
      setConfirmPassword('')
    }
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setApproved(false)
    setProfileName('')
    setAvatarUrl('')
    setBalance(0)
    setMessages([])
    setActivePage('dashboard')
    setShowProfileMenu(false)
  }

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  function navigate(page) {
    setActivePage(page)
    setShowProfileMenu(false)

    if (page === 'support') {
      loadMessages()
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="app">
        <div className="login-card">
          <h1>Loading...</h1>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // LOGIN / SIGNUP
  // --------------------------------------------------

  if (!session) {
    const isLogin = authMode === 'login'

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
                <label>Full Name</label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="Enter your name"
                />
              </>
            )}

            <label>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
            />

            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
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

            <span>•</span>

            <span>
              Crestline Bank 
            </span>
          </div>

        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // APPROVAL
  // --------------------------------------------------

  if (checkingApproval) {
    return (
      <div className="app">
        <div className="login-card">
          <h1>Please wait...</h1>

          <p className="subtitle">
            Checking your account approval.
          </p>
        </div>
      </div>
    )
  }

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
  // DISPLAY NAME
  // --------------------------------------------------

  const displayName =
    profileName ||
    session.user.email?.split('@')[0] ||
    'Customer'

  // --------------------------------------------------
  // PROFILE AVATAR
  // --------------------------------------------------

  function Avatar({ size = 'medium' }) {
    return (
      <div
        className={`user-avatar avatar-${size}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
          />
        ) : (
          <span>
            {displayName
              .charAt(0)
              .toUpperCase()}
          </span>
        )}
      </div>
    )
  }

  // --------------------------------------------------
  // SUPPORT PAGE
  // --------------------------------------------------

  function SupportPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Customer Support</h1>
            <p>
              We're here to help with your account.
            </p>
          </div>
        </div>

        <div className="support-card">

          <div className="support-top">
            <div className="support-avatar-large">
              C
            </div>

            <div>
              <strong>
                Crestline Customer Support
              </strong>

              <span className="online-status">
                ● Online
              </span>
            </div>
          </div>

          <div className="support-conversation">

            {messages.length === 0 && (
              <div className="conversation-intro">
                <div className="intro-icon">
                  💬
                </div>

                <h2>
                  How can we help?
                </h2>

                <p>
                  Send us a message and our
                  support team will respond.
                </p>
              </div>
            )}

            {messages.map((item) => (
              <div
                key={item.id}
                className="conversation-group"
              >

                {item.message && (
                  <div className="customer-message">
                    <div>
                      {item.message}
                    </div>

                    <small>
                      {item.temporary
                        ? 'Sending...'
                        : 'You'}
                    </small>
                  </div>
                )}

                {item.reply_text && (
                  <div className="support-message">
                    <strong>
                      Customer Support
                    </strong>

                    <div>
                      {item.reply_text}
                    </div>
                  </div>
                )}

              </div>
            ))}

          </div>

          <div className="support-input">
            <textarea
              value={supportMessage}
              onChange={(e) =>
                setSupportMessage(
                  e.target.value
                )
              }
              placeholder="Type a message..."
              rows={2}
              disabled={sendingMessage}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey
                ) {
                  e.preventDefault()

                  if (
                    supportMessage.trim() &&
                    !sendingMessage
                  ) {
                    handleSendMessage()
                  }
                }
              }}
            />

            <button
              type="button"
              disabled={
                sendingMessage ||
                !supportMessage.trim()
              }
              onClick={handleSendMessage}
            >
              {sendingMessage
                ? 'Sending...'
                : 'Send'}
            </button>
          </div>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // WALLET PAGE
  // --------------------------------------------------

  function WalletPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Bitcoin Wallet</h1>
            <p>
              Your Bitcoin wallet information.
            </p>
          </div>
        </div>

        <div className="wallet-card">

          <div className="wallet-big-icon">
            ₿
          </div>

          <h2>
            Your Bitcoin Wallet
          </h2>

          <p>
            This is your Bitcoin wallet address.
          </p>

          <div className="wallet-address-card">

            <small>
              BTC Wallet Address
            </small>

            <strong>
              {walletAddress}
            </strong>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    walletAddress
                  )

                  alert(
                    'Wallet address copied!'
                  )
                } catch {
                  alert(
                    'Please copy the address manually.'
                  )
                }
              }}
            >
              📋 Copy Address
            </button>

          </div>

          <div className="demo-notice">
            <strong>
               Wallet
            </strong>

            <p>
               Crestline Bank interface.
            </p>
          </div>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // TRANSFER PAGE
  // --------------------------------------------------

  function TransferPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Transfers</h1>
            <p>
              Review your recent transfer activity.
            </p>
          </div>
        </div>

        <div className="transaction-card">

          <div className="transaction-card-header">
            <strong>
              Recent Transfer
            </strong>

            <span className="status-complete">
              Completed
            </span>
          </div>

          <div className="transaction-details">

            <div>
              <span>Recipient</span>
              <strong>Alex John</strong>
            </div>

            <div>
              <span>Amount</span>
              <strong>$2,500.00</strong>
            </div>

            <div>
              <span>Date</span>
              <strong>July 12, 2026</strong>
            </div>

            <div>
              <span>Type</span>
              <strong>Bank Transfer</strong>
            </div>

          </div>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // WITHDRAW PAGE
  // --------------------------------------------------

  function WithdrawPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Withdraw</h1>
            <p>
              Manage your withdrawal services.
            </p>
          </div>
        </div>

        <div className="maintenance-card">

          <div className="maintenance-icon">
            🔧
          </div>

          <h2>
            Withdraw Unavailable
          </h2>

          <p>
            This service is currently unavailable
            because the site is undergoing maintenance.
          </p>

          <button
            type="button"
            onClick={() => navigate('support')}
          >
            💬 Contact Customer Support
          </button>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  function DashboardHome() {
    return (
      <div className="page-content">

        <div className="welcome-row">

          <div>
            <h1>
              Good day, {displayName} 👋
            </h1>

            <p>
              Here's what's happening with your
              accounts today.
            </p>
          </div>

          <select className="quick-view">
            <option>Quick view</option>
            <option>This month</option>
            <option>This year</option>
          </select>

        </div>

        {/* BALANCE */}

        <section className="main-balance-card">

          <div>
            <span>
              Available Balance
            </span>

            <h2>
              ${formatBalance(balance)}
            </h2>

            <p>
              Crestline Checking •••• 4821
            </p>
          </div>

          <div className="balance-growth">
            <strong>
              +4.25%
            </strong>

            <span>
              vs last month
            </span>
          </div>

          <div className="balance-card-design">
            <strong>
              Crestline Bank
            </strong>

            <span>
              •••• 4821
            </span>

            <b>
              VISA
            </b>
          </div>

        </section>

        {/* QUICK ACTIONS */}

        <section className="quick-actions">

          <button
            onClick={() => navigate('transfer')}
          >
            <span>↗️</span>
            <strong>Send Money</strong>
            <small>Send instantly</small>
          </button>

          <button
            onClick={() => navigate('transfer')}
          >
            <span>↔️</span>
            <strong>Transfer</strong>
            <small>Between accounts</small>
          </button>

          <button
            onClick={() =>
              alert('Deposit is a demo feature.')
            }
          >
            <span>↓</span>
            <strong>Deposit</strong>
            <small>Add funds</small>
          </button>

          <button
            onClick={() => navigate('withdraw')}
          >
            <span>▣</span>
            <strong>Withdraw</strong>
            <small>Cash out</small>
          </button>

          <button
            onClick={() =>
              alert('Pay Bills is a demo feature.')
            }
          >
            <span>▤</span>
            <strong>Pay Bills</strong>
            <small>Pay your bills</small>
          </button>

          <button
            onClick={() => navigate('wallet')}
          >
            <span>•••</span>
            <strong>More</strong>
            <small>See all</small>
          </button>

        </section>

        {/* TWO COLUMNS */}

        <div className="dashboard-two-columns">

          {/* ACCOUNTS */}

          <section className="dashboard-card">

            <div className="card-heading">
              <h2>Accounts</h2>

              <button
                onClick={() =>
                  alert(
                    'Accounts overview is a demo feature.'
                  )
                }
              >
                View all
              </button>
            </div>

            {accounts.map((account) => (
              <div
                className="account-row"
                key={account.name}
              >

                <div className="account-icon">
                  {account.icon}
                </div>

                <div className="account-info">
                  <strong>
                    {account.name}
                  </strong>

                  <span>
                    {account.number}
                  </span>
                </div>

                <div className="account-balance">
                  <strong>
                    ${formatBalance(account.balance)}
                  </strong>

                  <span>
                    Available balance
                  </span>
                </div>

              </div>
            ))}

          </section>

          {/* TRANSACTIONS */}

          <section className="dashboard-card">

            <div className="card-heading">
              <h2>
                Recent Transactions
              </h2>

              <button
                onClick={() =>
                  alert(
                    'Transaction history is a demo feature.'
                  )
                }
              >
                View all
              </button>
            </div>

            {transactions.map((item) => (
              <div
                className="transaction-row"
                key={item.title}
              >

                <div
                  className={`transaction-icon ${
                    item.type
                  }`}
                >
                  {item.icon}
                </div>

                <div className="transaction-info">
                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {item.date}
                  </span>
                </div>

                <strong
                  className={`transaction-amount ${
                    item.type
                  }`}
                >
                  {item.amount}
                </strong>

              </div>
            ))}

          </section>

        </div>

        {/* LOWER GRID */}

        <div className="dashboard-lower-grid">

          {/* SPENDING */}

          <section className="dashboard-card spending-card">

            <div className="card-heading">
              <h2>
                Spending Overview
              </h2>

              <select>
                <option>
                  This Month
                </option>
                <option>
                  Last Month
                </option>
              </select>
            </div>

            <h3 className="spending-total">
              $1,240.50
            </h3>

            <p className="spending-subtitle">
              Total spent this month
            </p>

            <div className="spending-chart">

              <div className="donut">
                <div>
                  <strong>
                    $1.2K
                  </strong>

                  <span>
                    spent
                  </span>
                </div>
              </div>

              <div className="spending-list">

                <div>
                  <span>
                    🔵 Shopping
                  </span>

                  <strong>
                    $450.20
                  </strong>
                </div>

                <div>
                  <span>
                    🔵 Bills & Utilities
                  </span>

                  <strong>
                    $320.40
                  </strong>
                </div>

                <div>
                  <span>
                    🔵 Transfer
                  </span>

                  <strong>
                    $280.00
                  </strong>
                </div>

                <div>
                  <span>
                    🔵 Entertainment
                  </span>

                  <strong>
                    $120.30
                  </strong>
                </div>

                <div>
                  <span>
                    🔵 Others
                  </span>

                  <strong>
                    $69.60
                  </strong>
                </div>

              </div>

            </div>

          </section>

          {/* CARD */}

          <section className="dashboard-card my-card">

            <div className="card-heading">
              <h2>My Cards</h2>

              <button>
                View all
              </button>
            </div>

            <div className="debit-card">

              <strong>
                Crestline Bank
              </strong>

              <span>
                •••• 4821
              </span>

              <small>
                DEBIT CARD
              </small>

              <b>
                VISA
              </b>

            </div>

            <div className="card-limit">

              <div>
                <span>
                  Spend limit
                </span>

                <strong>
                  $2,000.00 / $5,000.00
                </strong>
              </div>

              <div className="limit-bar">
                <span />
              </div>

            </div>

            <div className="card-actions">

              <button>
                🔒
                <span>
                  Lock Card
                </span>
              </button>

              <button>
                ▣
                <span>
                  Card Details
                </span>
              </button>

              <button>
                ⚙
                <span>
                  Settings
                </span>
              </button>

            </div>

          </section>

        </div>

        {/* BOTTOM GRID */}

        <div className="bottom-dashboard-grid">

          <section className="dashboard-card">

            <div className="card-heading">
              <h2>
                Upcoming Bills
              </h2>

              <button>
                View all
              </button>
            </div>

            <div className="bill-row">
              <span>⚡ Electricity Bill</span>
              <strong>$120.00</strong>
            </div>

            <div className="bill-row">
              <span>◉ Internet Bill</span>
              <strong>$60.00</strong>
            </div>

            <button className="primary-wide-button">
              Pay All
            </button>

          </section>

          <section className="dashboard-card">

            <div className="card-heading">
              <h2>
                Quick Transfer
              </h2>

              <button>
                View all
              </button>
            </div>

            <div className="contact-row">
              <span>JD</span>
              <div>
                <strong>John Doe</strong>
                <small>
                  +1 (555) 123-4567
                </small>
              </div>
            </div>

            <div className="contact-row">
              <span>JS</span>
              <div>
                <strong>Jane Smith</strong>
                <small>
                  +1 (555) 987-6543
                </small>
              </div>
            </div>

            <button
              className="primary-wide-button"
              onClick={() => navigate('transfer')}
            >
              New Transfer
            </button>

          </section>

          <section className="dashboard-card">

            <div className="card-heading">
              <h2>
                Notifications
              </h2>

              <button>
                View all
              </button>
            </div>

            <div className="notification-row">
              <span>↓</span>
              <div>
                <strong>
                  Your salary has been credited
                </strong>

                <small>
                  May 10, 2026 • 09:00 AM
                </small>
              </div>
            </div>

            <div className="notification-row">
              <span>▣</span>
              <div>
                <strong>
                  Electricity bill is due
                </strong>

                <small>
                  May 12, 2026 • 10:24 AM
                </small>
              </div>
            </div>

            <div className="notification-row">
              <span>!</span>
              <div>
                <strong>
                  New login detected
                </strong>

                <small>
                  May 12, 2026 • 08:15 AM
                </small>
              </div>
            </div>

          </section>

        </div>

        <footer className="dashboard-footer">
          <span>
            ©️ 2022 Crestline Bank All rights reserved.
          </span>

          <span>
            Privacy Policy • Terms of Service
          </span>
        </footer>

      </div>
    )
  }

  // --------------------------------------------------
  // MAIN APP
  // --------------------------------------------------

  return (
    <div className="bank-dashboard">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-brand">
          <div className="brand-symbol">
            ◆
          </div>

          <strong>
            Crestline Bank
          </strong>
        </div>

        <nav className="sidebar-nav">

          <button
            className={
              activePage === 'dashboard'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('dashboard')
            }
          >
            <span>▣</span>
            Dashboard
          </button>

          <button
            onClick={() =>
              alert('Accounts is a demo section.')
            }
          >
            <span>▤</span>
            Accounts
          </button>

          <button
            className={
              activePage === 'transfer'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('transfer')
            }
          >
            <span>↔️</span>
            Transfers
          </button>

          <button
            onClick={() =>
              navigate('transfer')
            }
          >
            <span>↑</span>
            Send Money
          </button>

          <button
            onClick={() =>
              alert('Pay Bills is a demo section.')
            }
          >
            <span>▤</span>
            Pay Bills
          </button>

          <button
            onClick={() =>
              alert('Cards is a demo section.')
            }
          >
            <span>▭</span>
            Cards
          </button>

          <button
            onClick={() =>
              alert(
                'Transactions is a demo section.'
              )
            }
          >
            <span>⇄</span>
            Transactions
          </button>

          <button
            onClick={() =>
              alert(
                'Beneficiaries is a demo section.'
              )
            }
          >
            <span>♙</span>
            Beneficiaries
          </button>

          <button
            onClick={() =>
              alert(
                'Statements is a demo section.'
              )
            }
          >
            <span>▤</span>
            Statements
          </button>

          <button
            onClick={() =>
              alert(
                'Notifications is a demo section.'
              )
            }
          >
            <span>♧</span>
            Notifications
          </button>

          <button
            onClick={() =>
              alert('Settings is a demo section.')
            }
          >
            <span>⚙</span>
            Settings
          </button>

          <button
            className={
              activePage === 'support'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('support')
            }
          >
            <span>?</span>
            Support
          </button>

        </nav>

        <div className="sidebar-bottom">

          <button
            onClick={handleLogout}
            className="logout-sidebar"
          >
            <span>↪</span>
            Log out
          </button>

          <div className="refer-card">
            <strong>
              Refer & Earn
            </strong>

            <p>
              Invite friends and earn rewards.
            </p>

            <button>
              Refer Now
            </button>

            <span className="gift">
              🎁
            </span>
          </div>

        </div>

      </aside>

      {/* MAIN AREA */}

      <div className="main-area">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="mobile-brand">
            ◆ Crestline Bank
          </div>

          <div className="search-box">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Search anything..."
            />
          </div>

          <button className="notification-button">
            ♧
            <span>3</span>
          </button>

          <div className="profile-area">

            <button
              type="button"
              className="profile-button"
              onClick={() =>
                setShowProfileMenu(
                  !showProfileMenu
                )
              }
            >
              <Avatar />

              <span>
                {displayName}
              </span>

              <small>⌄</small>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">

                <div className="profile-dropdown-top">

                  <Avatar size="large" />

                  <div>
                    <strong>
                      {displayName}
                    </strong>

                    <small>
                      {session.user.email}
                    </small>
                  </div>

                </div>

                <label className="upload-avatar-button">

                  {uploadingAvatar
                    ? 'Uploading...'
                    : '📷 Change Profile Picture'}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      handleAvatarUpload
                    }
                    disabled={
                      uploadingAvatar
                    }
                  />

                </label>

                <button
                  type="button"
                  onClick={handleLogout}
                >
                  ↪ Log Out
                </button>

              </div>
            )}

          </div>

        </header>

        {/* PAGE */}

        <main>

          {activePage === 'dashboard' &&
            <DashboardHome />}

          {activePage === 'support' &&
            <SupportPage />}

          {activePage === 'wallet' &&
            <WalletPage />}

          {activePage === 'transfer' &&
            <TransferPage />}

          {activePage === 'withdraw' &&
            <WithdrawPage />}

        </main>

      </div>

    </div>
  )
}

export default App