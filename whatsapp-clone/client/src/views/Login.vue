<template>
  <div class="login-page">
    <Auth />
  </div>
</template>

<script>
import Auth from '../components/Auth.vue';

export default {
  name: 'Login',
  components: { Auth }
};
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #00a884 0%, #128c7e 100%);
}
</style>
