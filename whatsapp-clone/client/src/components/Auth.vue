<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h2>WhatsApp Clone</h2>
        <p>Connect with friends and family</p>
      </div>
      
      <div class="auth-tabs">
        <button 
          :class="['tab-btn', { active: isLogin }]" 
          @click="switchToLogin"
        >
          Login
        </button>
        <button 
          :class="['tab-btn', { active: !isLogin }]" 
          @click="switchToRegister"
        >
          Register
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="!isLogin" class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username" 
            v-model="formData.username"
            placeholder="Enter your username"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="formData.email"
            :placeholder="isLogin ? 'Enter your email' : 'Enter your email'"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="formData.password"
            :placeholder="isLogin ? 'Enter your password' : 'Create a password'"
            required
            minlength="6"
          />
        </div>
        
        <div v-if="!isLogin" class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="formData.confirmPassword"
            placeholder="Confirm your password"
            required
            minlength="6"
          />
        </div>
        
        <button 
          type="submit" 
          class="auth-btn"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : (isLogin ? 'Login' : 'Register') }}
        </button>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Auth',
  setup() {
    const store = useStore();
    const router = useRouter();
    
    const isLogin = ref(true);
    const loading = ref(false);
    const error = ref('');
    
    const formData = ref({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    
    const switchToLogin = () => {
      isLogin.value = true;
      error.value = '';
      resetForm();
    };
    
    const switchToRegister = () => {
      isLogin.value = false;
      error.value = '';
      resetForm();
    };
    
    const resetForm = () => {
      formData.value = {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      };
    };
    
    const handleSubmit = async () => {
      error.value = '';
      loading.value = true;
      
      if (!isLogin.value) {
        // Validate passwords match for registration
        if (formData.value.password !== formData.value.confirmPassword) {
          error.value = 'Passwords do not match';
          loading.value = false;
          return;
        }
      }
      
      try {
        let result;
        if (isLogin.value) {
          result = await store.dispatch('auth/login', {
            email: formData.value.email,
            password: formData.value.password
          });
        } else {
          result = await store.dispatch('auth/register', {
            username: formData.value.username,
            email: formData.value.email,
            password: formData.value.password
          });
        }
        
        if (result.success) {
          router.push('/');
        } else {
          error.value = result.message || (isLogin.value ? 'Login failed' : 'Registration failed');
        }
      } catch (err) {
        error.value = err.message || 'An error occurred';
      } finally {
        loading.value = false;
      }
    };
    
    return {
      isLogin,
      loading,
      error,
      formData,
      switchToLogin,
      switchToRegister,
      handleSubmit
    };
  }
};
</script>

<style lang="scss" scoped>
.auth-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  
  .auth-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 30px;
    
    .auth-header {
      text-align: center;
      margin-bottom: 25px;
      
      h2 {
        color: #00a884;
        margin: 0 0 5px 0;
      }
      
      p {
        color: #667781;
        margin: 0;
      }
    }
    
    .auth-tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid #e9edef;
      
      .tab-btn {
        flex: 1;
        padding: 10px 0;
        background: none;
        border: none;
        cursor: pointer;
        font-weight: 500;
        color: #667781;
        position: relative;
        
        &.active {
          color: #00a884;
          
          &::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: #00a884;
          }
        }
      }
    }
    
    .auth-form {
      .form-group {
        margin-bottom: 15px;
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }
        
        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          
          &:focus {
            outline: none;
            border-color: #00a884;
            box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.2);
          }
        }
      }
      
      .auth-btn {
        width: 100%;
        padding: 12px;
        background-color: #00a884;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        
        &:hover {
          background-color: #069f7d;
        }
        
        &:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      }
      
      .error-message {
        margin-top: 15px;
        padding: 10px;
        background-color: #ffebee;
        color: #c62828;
        border-radius: 4px;
        text-align: center;
      }
    }
  }
}
</style>