import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function () {
  this.route('leak');
  this.route('no-leak');
});
