import Component from '@glimmer/component';

export default class LeakingComponent extends Component {
  // constructor() {
  //   super(...arguments);

  //   document.body.addEventListener('click', () => {
  //     console.log(this);
  //   });
  // }
}
