import api from './api';

export interface NotificationStatus {
  supported: boolean;
  configured: boolean;
  is_subscribed: boolean;
  active_subscriptions_count: number;
}

export const notificationService = {
  /**
   * Check if the current browser environment supports Push Notifications
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  },

  /**
   * Get current Notification permission state
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    return await Notification.requestPermission();
  },

  /**
   * Query backend status for current user's push subscriptions
   */
  async getStatus(): Promise<NotificationStatus> {
    const res = await api.get<NotificationStatus>('/notifications/status');
    return res.data;
  },

  /**
   * Subscribe user's current device via Service Worker PushManager
   */
  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;

    const permission = await this.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // If no existing subscription, register one
    if (!subscription) {
      // In production, user applicationServerKey can be passed if VAPID key is provided
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
        });
      } catch (err) {
        console.warn('[PWA] PushManager subscribe without VAPID key:', err);
      }
    }

    if (subscription) {
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      const p256dhStr = p256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))) : '';
      const authStr = auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : '';

      await api.post('/notifications/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dhStr,
          auth: authStr,
        },
        user_agent: navigator.userAgent.substring(0, 250),
      });

      return true;
    }

    return false;
  },

  /**
   * Unsubscribe user device from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/notifications/unsubscribe', {
          endpoint: subscription.endpoint,
        });
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Unsubscribe error:', err);
    }
    return false;
  },
};
