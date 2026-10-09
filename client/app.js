import { createApp } from 'vue';
import 'sweetalert2/dist/sweetalert2.min.css';
import './styles/app.css';
import App from './components/App.vue';
import store from './store';
import Icon from './components/Icon.vue';

const app = createApp(App);

app.use(store);
app.component('icon', Icon);
app.mount('#app');

export { app, store }
