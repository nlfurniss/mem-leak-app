import Route from '@ember/routing/route';

export default class Leak extends Route {
  model() {
    document.body.addEventListener('click', () => {
      console.log(this);
    });
  }
}
