import { createRouter, createWebHistory } from 'vue-router';
import store from '../store';

// Lazy load views for code splitting
// Only keep Login as eager load for fast initial load
const Home = () => import('../views/Home.vue');
const Chat = () => import('../views/Chat.vue');
const Profile = () => import('../views/Profile.vue');
const Groups = () => import('../views/Groups.vue');
const GroupDetail = () => import('../views/GroupDetail.vue');
const CallHistory = () => import('../views/CallHistory.vue');
const Contacts = () => import('../views/Contacts.vue');

// Auth pages - slightly lower priority lazy load
const Login = () => import('../views/Login.vue');
const Register = () => import('../views/Register.vue');

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:id',
    name: 'Chat',
    component: Chat,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/groups',
    name: 'Groups',
    component: Groups,
    meta: { requiresAuth: true }
  },
  {
    path: '/groups/:id',
    name: 'GroupDetail',
    component: GroupDetail,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/calls',
    name: 'CallHistory',
    component: CallHistory,
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: Contacts,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true }
  },
  // Catch-all redirect
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = store.getters['auth/isAuthenticated'];
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
