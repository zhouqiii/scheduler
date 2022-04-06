import Vue from 'vue';
import VueRouter from 'vue-router';
import clipboard from '../views/clipboard.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    component: clipboard,
  },
];

const router = new VueRouter({
  mode: 'hash',
  base: process.env.BASE_URL,
  routes,
});

export default router;
