'use strict';
/**
 * model
 */
var size = 0
export default class extends think.model.mongo {
    init(...args) {
        super.init(...args);
        this.tableName = 'usercount';
    }

    async getUserCount(){
        var data = await this.where({id:1}).find();
        console.log("getUserCount,userCount:"+data.usercount);
        if(data.usercount === undefined) {
            console.log("getUserCount,userCount is undefined:");
            var data = await this.add({
                id:1,usercount:0,playbackCount:data.playbackCount
            });
            data = await this.where({id:1}).find();
        }
        size = data.usercount;
        console.log("getUserCount,size:"+size);
        return size;
    }
    //用户数+1
    addUserCount(){
       this.where({id: 1}).increment('usercount', 1);
    }
    //获取当前回放条数
    async getPlaybackCount(){
        var data = await this.where({id:1}).find();
        return data.playbackCount;
    }
    //回放数+1
    addPlaybackCount()
    {
        this.where({id: 1}).increment('playbackCount', 1);
    }
}
