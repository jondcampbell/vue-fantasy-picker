import { createApp } from 'vue';
import 'bootswatch/dist/flatly/bootstrap.css'; // Change to this another theme if we want
import 'sweetalert2/dist/sweetalert2.min.css';
import App from './components/App.vue';
import router from './router';
import store from './store';
import Icon from './components/Icon.vue';

const app = createApp(App);

app.use(router);
app.use(store);
app.component('icon', Icon);
app.mount('#app');

export { app, router, store }
