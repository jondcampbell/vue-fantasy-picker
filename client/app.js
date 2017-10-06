import Vue from 'vue';
import bootstrap from 'bootstrap/scss/bootstrap.scss';
import bootswatch from 'bootswatch/flatly/bootstrap.min.css'; // Change to this another theme if we want
import { sync } from 'vuex-router-sync';
import App from './components/App';
import router from './router';
import store from './store';
import 'vue-awesome/icons';
import Icon from 'vue-awesome/components/Icon';

sync(store, router);
Vue.component('icon', Icon);
const app = new Vue({
  router,
  store,
  ...App
})

export { app, router, store }
