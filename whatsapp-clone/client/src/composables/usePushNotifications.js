import { ref, onMounted } from 'vue'

/**
 * Push notifications composable
 * Handles service worker registration, push subscription, and notifications
 */
export function usePushNotifications() {
  const isSupported = ref(false)
  const isSubscribed = ref(false)
  const permission = ref('default')
  const subscription = ref(null)
  const error = ref(null)
  const loading = ref(false)

  // VAPID public key from server (replace with actual key)
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

  // Check browser support
  const checkSupport = () => {
    isSupported.value = 'serviceWorker' in navigator && 
                        'PushManager' in window && 
                        'Notification' in window
    return isSupported.value
  }

  // Register service worker
  const registerServiceWorker = async () => {
    if (!checkSupport()) {
      error.value = '您的浏览器不支持推送通知'
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      console.log('Service Worker registered:', registration.scope)
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready
      
      return registration
    } catch (err) {
      console.error('Service Worker registration failed:', err)
      error.value = '服务注册失败'
      return null
    }
  }

  // Request notification permission
  const requestPermission = async () => {
    if (!checkSupport()) return false

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      return result === 'granted'
    } catch (err) {
      console.error('Permission request failed:', err)
      error.value = '权限请求失败'
      return false
    }
  }

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Subscribe to push notifications
  const subscribe = async () => {
    loading.value = true
    error.value = null

    try {
      // First request permission
      const granted = await requestPermission()
      if (!granted) {
        error.value = '需要通知权限才能接收消息'
        return false
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Check existing subscription
      let sub = await registration.pushManager.getSubscription()

      if (!sub) {
        // Create new subscription
        if (!VAPID_PUBLIC_KEY) {
          console.warn('VAPID key not configured, skipping push subscription')
          return false
        }

        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })

        // Send subscription to server
        await sendSubscriptionToServer(sub)
      }

      subscription.value = sub
      isSubscribed.value = true
      
      console.log('Push subscription:', sub.endpoint)
      return true
    } catch (err) {
      console.error('Push subscription failed:', err)
      error.value = '订阅失败: ' + err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    loading.value = true
    error.value = null

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()

      if (sub) {
        // Remove from server first
        await removeSubscriptionFromServer(sub)
        
        // Then unsubscribe locally
        await sub.unsubscribe()
      }

      subscription.value = null
      isSubscribed.value = false
      return true
    } catch (err) {
      console.error('Unsubscribe failed:', err)
      error.value = '取消订阅失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // Send subscription to server
  const sendSubscriptionToServer = async (sub) => {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        subscription: sub.toJSON()
      })
    })

    if (!response.ok) {
      throw new Error('Failed to save subscription on server')
    }
  }

  // Remove subscription from server
  const removeSubscriptionFromServer = async (sub) => {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        endpoint: sub.endpoint
      })
    })
  }

  // Show local notification (for testing or foreground messages)
  const showNotification = async (title, options = {}) => {
    if (permission.value !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return false
    }

    const registration = await navigator.serviceWorker.ready
    
    return registration.showNotification(title, {
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/badge-72.png',
      vibrate: [200, 100, 200],
      ...options
    })
  }

  // Check current subscription status
  const checkSubscription = async () => {
    if (!checkSupport()) return

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      
      subscription.value = sub
      isSubscribed.value = !!sub
      permission.value = Notification.permission
    } catch (err) {
      console.error('Failed to check subscription:', err)
    }
  }

  // Initialize on mount
  onMounted(async () => {
    if (checkSupport()) {
      await registerServiceWorker()
      await checkSubscription()
    }
  })

  return {
    isSupported,
    isSubscribed,
    permission,
    subscription,
    error,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    checkSubscription
  }
}
