import { createStore } from 'vuex';
import auth from './modules/auth';
import chat from './modules/chat';
import groups from './modules/groups';
import call from './modules/call';

export default createStore({
  modules: {
    auth,
    chat,
    groups,
    call
  }
});