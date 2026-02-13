<template>
  <div class="home">
    <div class="welcome-section">
      <h1>Welcome to WhatsApp Clone</h1>
      <p>Select a chat to start messaging</p>
    </div>
    
    <div class="features-section">
      <div class="feature-card">
        <div class="feature-icon">💬</div>
        <h3>Real-time Chat</h3>
        <p>Send and receive messages instantly with your contacts</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">📞</div>
        <h3>Voice Calls</h3>
        <p>Make high-quality voice calls to your friends and family</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">👥</div>
        <h3>Groups</h3>
        <p>Create and join groups to connect with multiple people</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home'
};
</script>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  
  .welcome-section {
    text-align: center;
    padding: 40px 0;
    
    h1 {
      color: #00a884;
      margin-bottom: 10px;
    }
    
    p {
      color: #667781;
      font-size: 18px;
    }
  }
  
  .features-section {
    display: flex;
    justify-content: center;
    gap: 30px;
    flex-wrap: wrap;
    
    .feature-card {
      background: white;
      border-radius: 10px;
      padding: 25px;
      width: 250px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      
      .feature-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      h3 {
        margin: 10px 0;
        color: #333;
      }
      
      p {
        color: #667781;
        margin: 0;
      }
    }
  }
}
</style>