<template>
  <div class="group-detail-container">
    <!-- Group Header -->
    <div class="group-header">
      <div class="back-button" @click="$router.go(-1)">
        <i class="icon-arrow-left"></i>
      </div>
      <div class="group-info">
        <div class="group-avatar">
          <img :src="currentGroup.avatar || '/default-group.png'" alt="Group Avatar" />
        </div>
        <div class="info">
          <h3>{{ currentGroup.name }}</h3>
          <p>{{ currentGroup.member_count }} members</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-icon" title="Menu">
          <i class="icon-menu"></i>
        </button>
      </div>
    </div>

    <!-- Group Members -->
    <div class="section-title">Members</div>
    <div class="members-list">
      <div 
        v-for="member in members" 
        :key="member.id"
        class="member-item"
      >
        <div class="member-avatar">
          <img :src="member.avatar || '/default-avatar.png'" alt="Member Avatar" />
        </div>
        <div class="member-info">
          <h4>{{ member.username }}</h4>
          <p>{{ member.email }}</p>
        </div>
        <div v-if="isCreator" class="member-actions">
          <button 
            v-if="member.id !== currentUser.id"
            @click="removeMember(member.id)"
            class="btn btn-danger"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Group Options -->
    <div class="section-title">Group Options</div>
    <div class="options-list">
      <div class="option-item">
        <div class="option-icon">
          <i class="icon-lock"></i>
        </div>
        <div class="option-info">
          <h4>Group Privacy</h4>
          <p>Who can see this group?</p>
        </div>
      </div>
      
      <div class="option-item">
        <div class="option-icon">
          <i class="icon-notification"></i>
        </div>
        <div class="option-info">
          <h4>Notifications</h4>
          <p>Group notifications settings</p>
        </div>
      </div>
      
      <div class="option-item">
        <div class="option-icon">
          <i class="icon-media"></i>
        </div>
        <div class="option-info">
          <h4>Media Visibility</h4>
          <p>Who can see media shared in this group?</p>
        </div>
      </div>
    </div>

    <!-- Add Member Button (only for creators) -->
    <div v-if="isCreator" class="add-member-section">
      <button @click="showAddMemberModal = true" class="btn btn-primary">
        <i class="icon-add"></i> Add Members
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';

export default {
  name: 'GroupDetail',
  setup() {
    const store = useStore();
    const route = useRoute();
    
    const showAddMemberModal = ref(false);
    const members = ref([]);
    const currentGroup = ref({});
    
    const currentUser = computed(() => store.getters['auth/currentUser']);
    
    const isCreator = computed(() => {
      // In a real app, this would check if current user is the group creator
      return currentGroup.value.creator_id === currentUser.value.id;
    });
    
    const loadGroupDetails = async () => {
      // In a real app, we would fetch group details from the backend
      // For now, we'll use mock data
      currentGroup.value = {
        id: route.params.id,
        name: 'Mock Group Name',
        description: 'This is a mock group description',
        avatar: '/default-group.png',
        member_count: 0,
        creator_id: 1 // Mock creator ID
      };
      
      // Load members
      loadMembers();
    };
    
    const loadMembers = async () => {
      // In a real app, we would fetch group members from the backend
      // For now, we'll use mock data
      members.value = [
        { id: 1, username: 'Current User', email: currentUser.value.email, avatar: currentUser.value.avatar },
        { id: 2, username: 'John Doe', email: 'john@example.com', avatar: '/avatar1.jpg' },
        { id: 3, username: 'Jane Smith', email: 'jane@example.com', avatar: '/avatar2.jpg' }
      ];
      
      currentGroup.value.member_count = members.value.length;
    };
    
    const removeMember = async (memberId) => {
      if (!confirm('Are you sure you want to remove this member?')) return;
      
      // In a real app, we would call the API to remove the member
      // For now, we'll just update the local list
      members.value = members.value.filter(m => m.id !== memberId);
      currentGroup.value.member_count = members.value.length;
    };
    
    onMounted(() => {
      loadGroupDetails();
    });
    
    return {
      showAddMemberModal,
      members,
      currentGroup,
      currentUser,
      isCreator,
      removeMember
    };
  }
};
</script>

<style lang="scss" scoped>
.group-detail-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .group-header {
    padding: 10px 16px;
    background-color: #f0f2f5;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e9edef;
    
    .back-button {
      margin-right: 10px;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      
      &:hover {
        background-color: #e9edef;
      }
    }
    
    .group-info {
      display: flex;
      align-items: center;
      flex: 1;
      
      .group-avatar {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        overflow: hidden;
        margin-right: 10px;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      .info {
        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        p {
          margin: 0;
          font-size: 13px;
          color: #667781;
        }
      }
    }
    
    .header-actions {
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &:hover {
          background-color: #e9edef;
        }
      }
    }
  }
  
  .section-title {
    padding: 10px 16px;
    font-size: 16px;
    color: #667781;
    background-color: #f0f2f5;
  }
  
  .members-list {
    .member-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f2f5;
      
      .member-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 15px;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      .member-info {
        flex: 1;
        
        h4 {
          margin: 0 0 2px 0;
          font-size: 16px;
          font-weight: 500;
        }
        
        p {
          margin: 0;
          font-size: 14px;
          color: #667781;
        }
      }
      
      .member-actions {
        .btn-danger {
          background-color: #ff4d4d;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          
          &:hover {
            background-color: #e60000;
          }
        }
      }
    }
  }
  
  .options-list {
    .option-item {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #f0f2f5;
      cursor: pointer;
      
      &:hover {
        background-color: #f0f2f5;
      }
      
      .option-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #e9edef;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        color: #667781;
      }
      
      .option-info {
        flex: 1;
        
        h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 500;
        }
        
        p {
          margin: 0;
          font-size: 14px;
          color: #667781;
        }
      }
    }
  }
  
  .add-member-section {
    padding: 20px;
    text-align: center;
    
    .btn-primary {
      background-color: #00a884;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      
      &:hover {
        background-color: #069f7d;
      }
      
      i {
        margin-right: 5px;
      }
    }
  }
}
</style>