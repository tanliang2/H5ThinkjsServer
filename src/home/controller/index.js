'use strict';

import Base from './base.js';

export default class extends Base {
  init(http) {
    super.init(http);
    this.http.header("Access-Control-Allow-Origin", "*");
    this.http.header("Access-Control-Allow-Headers", "X-Requested-With");
    this.http.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    this.http.header("X-Powered-By", ' 3.2.1')
    this.http.header("Content-Type", "application/json;charset=utf-8");
  }
  /**
   * index action
   * @return {Promise} []
   */
  indexAction() {
    //auto render template file index_index.html
    this.http.end("红鸟H5游戏平台 v1.0.1");
 //   return this.display();
  }

  async changelogAction() {
    // let controllerInstance = this.controller('home/socketio');
    // var result = await this.model("user").getUserList();
    var roomcfg = this.config("roomcfg");
    return this.success({ result: roomcfg });
  }
}