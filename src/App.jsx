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
  const [savingProfile, setSavingProfile] = useState(false)

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
  const [showCardDetails, setShowCardDetails] = useState(false)

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
    {
      title: 'Grocery Store',
      date: 'May 3, 2026 • 06:20 PM',
      amount: '-$145.80',
      type: 'out',
      icon: 'G',
    },
    {
      title: 'Freelance Payment',
      date: 'May 1, 2026 • 01:10 PM',
      amount: '+$1,250.00',
      type: 'in',
      icon: '↓',
    },
  ]

  // --------------------------------------------------
  // BILLS
  // --------------------------------------------------

  const bills = [
    {
      name: 'Electricity Bill',
      company: 'Power & Energy',
      due: 'May 15, 2026',
      amount: 120.00,
      icon: '⚡',
    },
    {
      name: 'Internet Bill',
      company: 'Internet Service',
      due: 'May 18, 2026',
      amount: 60.00,
      icon: '◉',
    },
    {
      name: 'Water Bill',
      company: 'Water Services',
      due: 'May 20, 2026',
      amount: 45.50,
      icon: '💧',
    },
    {
      name: 'Phone Bill',
      company: 'Mobile Services',
      due: 'May 22, 2026',
      amount: 85.00,
      icon: '☎',
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
      }

      const metadata = session.user.user_metadata || {}

      const metadataName =
        typeof metadata.full_name === 'string'
          ? metadata.full_name.trim()
          : ''

      setProfileName(
        typeof data?.display_name === 'string' &&
          data.display_name.trim()
          ? data.display_name.trim()
          : metadataName
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
  // SAVE PROFILE SETTINGS
  // --------------------------------------------------

  async function saveProfileSettings() {
    if (!session?.user?.id) return

    const cleanName = profileName.trim()

    if (!cleanName) {
      alert('Please enter your name.')
      return
    }

    setSavingProfile(true)

    try {
      const { error: authError } =
        await supabase.auth.updateUser({
          data: {
            full_name: cleanName,
          },
        })

      if (authError) {
        throw authError
      }

      const { error: profileError } =
        await supabase
          .from('profiles')
          .update({
            display_name: cleanName,
          })
          .eq('id', session.user.id)

      if (profileError) {
        throw profileError
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setSession((previous) => ({
          ...previous,
          user,
        }))
      }

      alert('Profile settings saved successfully.')
      setShowProfileMenu(false)
    } catch (error) {
      console.error(
        'Profile settings error:',
        error
      )

      alert(
        error.message ||
          'Unable to save your profile settings.'
      )
    } finally {
      setSavingProfile(false)
    }
  }

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

      /*
       * One permanent avatar location for each user.
       * This means the profile picture belongs to the
       * account instead of the phone/device.
       */
      const filePath = `${userId}/avatar`

      const { error: uploadError } =
        await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
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

      /*
       * Cache-busting makes a newly uploaded picture
       * appear immediately even when the old picture
       * was cached by the browser.
       */
      const freshAvatarUrl =
        `${publicUrl}?v=${Date.now()}`

      const { error: profileError } =
        await supabase
          .from('profiles')
          .update({
            avatar_url: freshAvatarUrl,
          })
          .eq('id', userId)

      if (profileError) {
        throw profileError
      }

      setAvatarUrl(freshAvatarUrl)

      alert(
        'Profile picture updated successfully!'
      )
    } catch (error) {
      console.error(
        'Avatar upload error:',
        error
      )

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
      console.error(
        'Could not load messages:',
        error
      )
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

  function backToDashboard() {
    setActivePage('dashboard')
    setShowProfileMenu(false)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
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
    session.user.user_metadata?.full_name ||
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
          <span className="default-avatar-icon">
            👤
          </span>
        )}
      </div>
    )
  }

  // --------------------------------------------------
  // BACK BUTTON
  // --------------------------------------------------

  function BackButton() {
    return (
      <button
        type="button"
        className="back-dashboard-button"
        onClick={backToDashboard}
      >
        ← Back to Dashboard
      </button>
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

          <BackButton />
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
  onChange={(e) => {
    setSupportMessage(e.currentTarget.value)
  }}
  placeholder="Type a message..."
  rows={2}
  disabled={sendingMessage}
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

          <BackButton />
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
       function TransferPage({ onBack }) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferMessage, setTransferMessage] = useState('')

  const handleTransfer = async (e) => {
    e.preventDefault()

    if (transferLoading) return

    setTransferMessage('')

    const email = recipientEmail.trim()
    const transferAmount = Number(amount)
    const transferDescription = description.trim()

    if (!email) {
      setTransferMessage('Please enter the recipient email.')
      return
    }

    if (!transferAmount || transferAmount <= 0) {
      setTransferMessage('Please enter a valid amount.')
      return
    }

    try {
      setTransferLoading(true)

      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('email', email)
        .maybeSingle()

      if (recipientError) {
        throw recipientError
      }

      if (!recipient) {
        setTransferMessage('Recipient was not found.')
        return
      }

      const { error: transferError } = await supabase.rpc(
        'transfer_money',
        {
          p_recipient_id: recipient.id,
          p_amount: transferAmount,
          p_description: transferDescription || null
        }
      )

      if (transferError) {
        throw transferError
      }

      setTransferMessage(
        `Transfer of $${transferAmount.toFixed(2)} to ${
          recipient.display_name || recipient.email
        } was successful.`
      )

      setRecipientEmail('')
      setAmount('')
      setDescription('')

    } catch (error) {
      console.error('Transfer error:', error)

      setTransferMessage(
        error?.message || 'Transfer could not be completed.'
      )
    } finally {
      setTransferLoading(false)
    }
  }

  return (
    <div className="page-content">

      <div className="page-title-row">
        <div>
          <h1>Transfers</h1>
          <p>Send money to another Crestline customer.</p>
        </div>

        <button
          type="button"
          className="back-dashboard-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="transaction-card">

        <div className="transaction-card-header">
          <strong>Send Money</strong>
        </div>

        <form onSubmit={handleTransfer}>

          <div className="transaction-details">

            <div>
              <span>Recipient Email</span>

              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value)
                }}
                placeholder="customer@example.com"
                disabled={transferLoading}
                autoComplete="off"
              />
            </div>

            <div>
              <span>Amount</span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                }}
                placeholder="0.00"
                disabled={transferLoading}
              />
            </div>

            <div>
              <span>Description</span>

              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                }}
                placeholder="Optional"
                disabled={transferLoading}
                autoComplete="off"
              />
            </div>

          </div>

          <button
            type="submit"
            className="primary-wide-button"
            disabled={transferLoading}
          >
            {transferLoading
              ? 'Processing...'
              : 'Send Money'}
          </button>

        </form>

        {transferMessage && (
          <div className="transfer-message">
            {transferMessage}
          </div>
        )}

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

          <BackButton />
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
            onClick={() =>
              navigate('support')
            }
          >
            💬 Contact Customer Support
          </button>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // DEPOSIT PAGE
  // --------------------------------------------------

  function DepositPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Deposit</h1>

            <p>
              Manage your deposit services.
            </p>
          </div>

          <BackButton />
        </div>

        <div className="maintenance-card">

          <div className="maintenance-icon">
            🔧
          </div>

          <h2>
            Deposit Unavailable
          </h2>

          <p>
            This service is currently unavailable
            because the site is undergoing maintenance.
            Please contact Customer Support for assistance.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('support')
            }
          >
            💬 Contact Customer Support
          </button>

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // PAY BILLS PAGE
  // --------------------------------------------------

  function PayBillsPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Pay Bills</h1>

            <p>
              Review and manage your upcoming bills.
            </p>
          </div>

          <BackButton />
        </div>

        <div className="bills-page-grid">

          {bills.map((bill) => (
            <div
              className="bill-detail-card"
              key={bill.name}
            >

              <div className="bill-detail-icon">
                {bill.icon}
              </div>

              <div className="bill-detail-info">

                <strong>
                  {bill.name}
                </strong>

                <span>
                  {bill.company}
                </span>

                <small>
                  Due {bill.due}
                </small>

              </div>

              <div className="bill-detail-right">

                <strong>
                  ${formatBalance(bill.amount)}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    alert(
                      `${bill.name} unvailable.`
                    )
                  }
                >
                  Pay Bill
                </button>

              </div>

            </div>
          ))}

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // ACCOUNTS PAGE
  // --------------------------------------------------

  function AccountsPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Accounts</h1>

            <p>
              View all of your Crestline accounts.
            </p>
          </div>

          <BackButton />
        </div>

        <div className="more-section-grid">

          {accounts.map((account) => (
            <div
              className="dashboard-card more-account-card"
              key={account.name}
            >

              <div className="account-icon">
                {account.icon}
              </div>

              <h2>
                {account.name}
              </h2>

              <span>
                {account.number}
              </span>

              <strong>
                ${formatBalance(account.balance)}
              </strong>

              <small>
                Available balance
              </small>

            </div>
          ))}

        </div>

      </div>
    )
  }

  // --------------------------------------------------
  // TRANSACTIONS PAGE
  // --------------------------------------------------

  function TransactionsPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Recent Transactions</h1>

            <p>
              Review your recent account activity.
            </p>
          </div>

          <BackButton />
        </div>

        <section className="dashboard-card full-width-card">

          {transactions.map((item) => (
            <div
              className="transaction-row"
              key={`${item.title}-${item.date}`}
            >

              <div
                className={`transaction-icon ${item.type}`}
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
                className={`transaction-amount ${item.type}`}
              >
                {item.amount}
              </strong>

            </div>
          ))}

        </section>

      </div>
    )
  }

  // --------------------------------------------------
  // SPENDING PAGE
  // --------------------------------------------------

  function SpendingPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Spending Overview</h1>

            <p>
              Review your spending for this month.
            </p>
          </div>

          <BackButton />
        </div>

        <section className="dashboard-card spending-card">

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

      </div>
    )
  }

  // --------------------------------------------------
  // MY CARD PAGE
  // --------------------------------------------------

  function MyCardPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>My Card</h1>

            <p>
              Manage your Crestline debit card.
            </p>
          </div>

          <BackButton />
        </div>

        <section className="dashboard-card my-card">

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
          <button
  type="button"
  className="primary-wide-button"
  onClick={() => setShowCardDetails(true)}
>
  ▣ View Card Details
</button>
          
         
          {showCardDetails && (
  <div className="card-details-panel">

    <div className="card-details-header">
      <div>
        <h2>Card Details</h2>
        <p>Your debit card information</p>
      </div>

      <button
        type="button"
        className="close-card-details"
        onClick={() => setShowCardDetails(false)}
      >
        ×
      </button>
    </div>

    <div className="card-details-list">

      <div className="card-detail-item">
        <span>Cardholder</span>
        <strong>{displayName}</strong>
      </div>

      <div className="card-detail-item">
        <span>Card Number</span>
        <strong>8754 3452 2345 4821</strong>
      </div>

      <div className="card-detail-item">
        <span>Card Type</span>
        <strong>Visa Debit</strong>
      </div>

      <div className="card-detail-item">
        <span>Expiry Date</span>
        <strong>12/29</strong>
      </div>

      <div className="card-detail-item">
        <span>CVV</span>
        <strong>678</strong>
      </div>

      <div className="card-detail-item">
        <span>Status</span>
        <strong className="card-active-status">
          ● Active
        </strong>
      </div>

      <div className="card-detail-item">
        <span>Spending Limit</span>
        <strong>$5,000.00</strong>
      </div>

      <div className="card-detail-item">
        <span>Available Spending</span>
        <strong>$3,000.00</strong>
      </div>

    </div>

    <div className="card-details-security">
      🔒 Your card information is protected.
    </div>

  </div>
)}

        </section>

      </div>
    )
  }

  // --------------------------------------------------
  // QUICK TRANSFER PAGE
  // --------------------------------------------------

  function QuickTransferPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Quick Transfer</h1>

            <p>
              Choose a beneficiary for a quick transfer.
            </p>
          </div>

          <BackButton />
        </div>

        <section className="dashboard-card">

          <div className="contact-row">

            <span>JD</span>

            <div>
              <strong>
                John Doe
              </strong>

              <small>
                +1 (555) 123-4567
              </small>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('transfer')
              }
            >
              Transfer
            </button>

          </div>

          <div className="contact-row">

            <span>JS</span>

            <div>
              <strong>
                Jane Smith
              </strong>

              <small>
                +1 (555) 987-6543
              </small>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('transfer')
              }
            >
              Transfer
            </button>

          </div>

          <button
            className="primary-wide-button"
            type="button"
            onClick={() =>
              navigate('transfer')
            }
          >
            New Transfer
          </button>

        </section>

      </div>
    )
  }

  // --------------------------------------------------
  // NOTIFICATIONS PAGE
  // --------------------------------------------------

  function NotificationsPage() {
    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>Notifications</h1>

            <p>
              View your latest account notifications.
            </p>
          </div>

          <BackButton />
        </div>

        <section className="dashboard-card">

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
    )
  }

  // --------------------------------------------------
  // MORE PAGE
  // --------------------------------------------------

  function MorePage() {
    const moreSections = [
      {
        title: 'Accounts',
        description:
          'View your checking, savings and business accounts.',
        icon: '▤',
        page: 'accounts',
      },
      {
        title: 'Recent Transactions',
        description:
          'Review your latest deposits, payments and transfers.',
        icon: '⇄',
        page: 'transactions',
      },
      {
        title: 'Spending Overview',
        description:
          'See how your money has been spent this month.',
        icon: '◔',
        page: 'spending',
      },
      {
        title: 'My Card',
        description:
          'View your debit card and card controls.',
        icon: '▭',
        page: 'card',
      },
      {
        title: 'Upcoming Bills',
        description:
          'Review bills that are coming due.',
        icon: '▤',
        page: 'bills',
      },
      {
        title: 'Quick Transfer',
        description:
          'Quickly transfer money to your contacts.',
        icon: '↔️',
        page: 'quick-transfer',
      },
      {
        title: 'Notifications',
        description:
          'See important account notifications.',
        icon: '♧',
        page: 'notifications',
      },
      {
        title: 'Bitcoin Wallet',
        description:
          'View and copy your Bitcoin wallet address.',
        icon: '₿',
        page: 'wallet',
      },
    ]

    return (
      <div className="page-content">

        <div className="page-title-row">
          <div>
            <h1>More</h1>

            <p>
              Access your additional banking services.
            </p>
          </div>

          <BackButton />
        </div>

        <div className="more-sections-grid">

          {moreSections.map((item) => (
            <button
              type="button"
              className="more-section-card"
              key={item.page}
              onClick={() =>
                navigate(item.page)
              }
            >

              <div className="more-section-icon">
                {item.icon}
              </div>

              <div className="more-section-content">

                <strong>
                  {item.title}
                </strong>

                <span>
                  {item.description}
                </span>

              </div>

              <div className="more-section-arrow">
                →
              </div>

            </button>
          ))}

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
            <option>
              Quick view
            </option>

            <option>
              This month
            </option>

            <option>
              This year
            </option>
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
            type="button"
            onClick={() =>
              navigate('transfer')
            }
          >
            <span>↗️</span>
            <strong>Send Money</strong>
            <small>Send instantly</small>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('transfer')
            }
          >
            <span>↔️</span>
            <strong>Transfer</strong>
            <small>Between accounts</small>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('deposit')
            }
          >
            <span>↓</span>
            <strong>Deposit</strong>
            <small>Currently unavailable</small>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('withdraw')
            }
          >
            <span>▣</span>
            <strong>Withdraw</strong>
            <small>Currently unavailable</small>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('bills')
            }
          >
            <span>▤</span>
            <strong>Pay Bills</strong>
            <small>Pay your bills</small>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('more')
            }
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

              <h2>
                Accounts
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate('accounts')
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
                type="button"
                onClick={() =>
                  navigate('transactions')
                }
              >
                View all
              </button>

            </div>

            {transactions
              .slice(0, 5)
              .map((item) => (
                <div
                  className="transaction-row"
                  key={`${item.title}-${item.date}`}
                >

                  <div
                    className={`transaction-icon ${item.type}`}
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
                    className={`transaction-amount ${item.type}`}
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

              <button
                type="button"
                onClick={() =>
                  navigate('spending')
                }
              >
                View all
              </button>

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

              <h2>
                My Cards
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate('card')
                }
              >
                View all
              </button>

            </div>

            <div className="debit-card">

              <strong>
                Crestline Bank
              </strong>

              <span>
                3452 4821
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

              <button
                type="button"
                onClick={() =>
                  alert(
                    'Unavailable.'
                  )
                }
              >
                🔒
                <span>
                  Lock Card
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('card')
                }
              >
                ▣
                <span>
                  Card Details
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('card')
                }
              >
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

              <button
                type="button"
                onClick={() =>
                  navigate('bills')
                }
              >
                View all
              </button>

            </div>

            {bills
              .slice(0, 2)
              .map((bill) => (
                <div
                  className="bill-row"
                  key={bill.name}
                >

                  <span>
                    {bill.icon} {bill.name}
                  </span>

                  <strong>
                    ${formatBalance(bill.amount)}
                  </strong>

                </div>
              ))}

            <button
              type="button"
              className="primary-wide-button"
              onClick={() =>
                navigate('bills')
              }
            >
              View Bills
            </button>

          </section>

          <section className="dashboard-card">

            <div className="card-heading">

              <h2>
                Quick Transfer
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate('quick-transfer')
                }
              >
                View all
              </button>

            </div>

            <div className="contact-row">

              <span>JD</span>

              <div>
                <strong>
                  John Doe
                </strong>

                <small>
                  +1 (555) 123-4567
                </small>
              </div>

            </div>

            <div className="contact-row">

              <span>JS</span>

              <div>
                <strong>
                  Jane Smith
                </strong>

                <small>
                  +1 (555) 987-6543
                </small>
              </div>

            </div>

            <button
              type="button"
              className="primary-wide-button"
              onClick={() =>
                navigate('transfer')
              }
            >
              New Transfer
            </button>

          </section>

          <section className="dashboard-card">

            <div className="card-heading">

              <h2>
                Notifications
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate('notifications')
                }
              >
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
            className={
              activePage === 'accounts'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('accounts')
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
            className={
              activePage === 'bills'
                ? 'active'
                : ''
            }
            onClick={() =>
              navigate('bills')
            }
          >
            <span>▤</span>
            Pay Bills
          </button>

          <button
            onClick={() =>
              navigate('card')
            }
          >
            <span>▭</span>
            Cards
          </button>

          <button
            onClick={() =>
              navigate('transactions')
            }
          >
            <span>⇄</span>
            Transactions
          </button>

          <button
            onClick={() =>
              alert(
                'not available.'
              )
            }
          >
            <span>♙</span>
            Beneficiaries
          </button>

          <button
            onClick={() =>
              alert(
                'Unavailable.'
              )
            }
          >
            <span>▤</span>
            Statements
          </button>

          <button
            onClick={() =>
              navigate('notifications')
            }
          >
            <span>♧</span>
            Notifications
          </button>

          <button
            onClick={() =>
              alert('No Notification.')
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

            <button
              type="button"
              onClick={() =>
                alert(
                  'Refer Now.'
                )
              }
            >
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

          <button
            type="button"
            className="notification-button"
            onClick={() =>
              navigate('notifications')
            }
          >
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

              <Avatar size="large" />

              <span>
                {displayName}
              </span>

              <small>
                ⌄
              </small>

            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">

                <div className="profile-dropdown-top">

                  <Avatar size="xlarge" />

                  <div>

                    <strong>
                      {displayName}
                    </strong>

                    <small>
                      {session.user.email}
                    </small>

                  </div>

                </div>

                <div className="profile-edit-section">

                  <label>
                    Profile Name
                  </label>

                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) =>
                      setProfileName(
                        e.target.value
                      )
                    }
                    placeholder="Your name"
                  />

                  <button
                    type="button"
                    className="save-profile-button"
                    onClick={saveProfileSettings}
                    disabled={savingProfile}
                  >
                    {savingProfile
                      ? 'Saving...'
                      : 'Save Profile'}
                  </button>

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
             SupportPage()}

          {activePage === 'wallet' &&
            <WalletPage />}

          {activePage === 'transfer' &&
            <TransferPage onBack={backToDashboard} />}

          {activePage === 'withdraw' &&
            <WithdrawPage />}

          {activePage === 'deposit' &&
            <DepositPage />}

          {activePage === 'bills' &&
            <PayBillsPage />}

          {activePage === 'accounts' &&
            <AccountsPage />}

          {activePage === 'transactions' &&
            <TransactionsPage />}

          {activePage === 'spending' &&
            <SpendingPage />}

          {activePage === 'card' &&
            <MyCardPage />}

          {activePage === 'quick-transfer' &&
            <QuickTransferPage />}

          {activePage === 'notifications' &&
            <NotificationsPage />}

          {activePage === 'more' &&
            <MorePage />}

        </main>

      </div>

    </div>
  )
}

export default App