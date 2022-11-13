'use strict';
var structData = require("./../config/structdata");
var upGradeLogic = require("./../logic/upgradelogic");
var eventDispatcher = require("./../controller/eventdispatcher");
export default class roomuserManager extends think.base {
    init(socket, user, roomId, roomModel, deskStation) {
        this.socket = socket;
        this.user = user;
        this.roomId = roomId;
        this.roomModel = roomModel;
        this.deskStation = deskStation;
        this.mahjongList = []; //手牌
        this.specialMahList = []; //亮出来的牌（碰或杠或吃）
        this.currentState = structData.GAME_ST_WAIT;
        this.roundScore = 0; //本局当前输赢情况
        this.totalScore = 0; //在本房间内的输赢情况
        this.pao_num = 0; //在本房间总共放炮的次数
        this.zhuang_num = 0; //坐庄次数
        this.hu_num = 0; //胡次数
        this.isOutline = false;
        this.isready = true;
        this.historyList = []; //出过的牌记录
        this.winList = []; //赢的牌列表
        this.catchedPai = -1; //刚抓到的牌
        this.gangNum = 0; //开杠数
        this.huNum = 0; //胡牌的番数
        this.haveSpecial = false; //当前是否有待处理特殊情况
        this.dissRoomAnswer = -1;
        this.isTing = false;
        this.winResultList = [];
        this.isbot = user.isbot ? true : false;
        this.clientonline = true;
        this.checkResult = {};

        var mahLen = this.roomModel.gameType == upGradeLogic.TYPE_NORMAL ? 30 : 27;
        for (var i = 0; i < mahLen; i++) {
            this.mahjongList.push(0);
        }

        this.clientEventHandle();
    }

    //进入房间后初始化
    startUp() {
        var gameState = this.currentState;
        var roomData = {};
        var userDataList = {};
        roomData.gameStation = this.roomModel.gameStation;
        roomData.zDeskStation = this.roomModel.zDeskStation;
        roomData.selfDeskStation = this.deskStation;
        roomData.selfState = this.currentState;
        roomData.roomId = this.roomId;
        roomData.roomType = this.roomModel.roomType;
        roomData.maxRound = this.roomModel.maxRound;
        roomData.haveSpecial = this.haveSpecial;
        roomData.waitDoSpecialNum = this.roomModel.waitDoSpecialNum;
        this.socket.emit("initRoom", roomData);
    }
    //重新进入游戏时设置socket
    setSocket(socket) {
        if (this.socket.id != socket.id) {
            this.socket.leave(this.roomId);
            this.socket = null;
        //    this.socket.disconnect();
            this.socket = socket;
            this.clientEventHandle();
        }
    }
    //事件监听
    clientEventHandle() {
        var _this = this;
        _this.socket.setMaxListeners(255);
        //准备
        _this.socket.on("ready", function (isready) {
            if (isready)
                _this.currentState = structData.GAME_ST_READY;
            else
                _this.currentState = structData.GAME_ST_WAIT;
            _this.roomModel.checkStart(_this.deskStation);
        })
        //房主开始游戏
        _this.socket.on("startGame", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.roomModel.startGame();
        })
        //出牌
        _this.socket.on("playCard", function (data, isting) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            if (_this.deskStation != _this.roomModel.currtCatchUser) return;
            _this.onPlayCard(data, isting);
        });
        //处理特殊情况
        _this.socket.on("doSpecial", function (data) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.onDoSpecial(data);
        });
        //放弃处理特殊情况
        _this.socket.on("skipSpecial", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.haveSpecial = false;
            _this.roomModel.userSkipSpecial(_this.deskStation);
        })
        //起牌后检查是否有特殊情况（杠、听、胡）
        _this.socket.on("checkSelfSpecial", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.checkMahList();
        })
        //主动退出房间
        _this.socket.on("leaveRoom", function (deskStation) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.socket.leave(_this.roomId);
            _this.roomModel.userLeaveRoom(deskStation);
        })
        //验证并未掉线
        _this.socket.on("notoutline",function(){
            _this.clientonline = true;
        })
        //用户掉线
        _this.socket.on('disconnect', function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.clientonline = false;
            _this.socket.emit("disconnectTest");
            setTimeout(function() {
                if(!_this.clientonline)
                {
                    if (upGradeLogic.socketioProxy)
                        upGradeLogic.socketioProxy.removeSocket(_this.socket);
                    _this.isOutline = true;
                    _this.currentState = structData.GAME_ST_OUT;
                    for (var i = 0; i < _this.roomModel.doSpcialUserList.length; i++) {
                        if (_this.roomModel.doSpcialUserList[i].deskStation == _this.deskStation) {
                            _this.roomModel.doSpcialUserList.splice(i, 1);
                            break;
                        }
                    }
                    if (_this.haveSpecial) {
                       // _this.roomModel.userSkipSpecial(_this.deskStation);
                    }
                    _this.socket.leave(_this.roomId);
                    _this.roomModel.userLeaveRoom(_this.deskStation);
                    if (_this.roomModel && _this.roomModel.isDissing) {
                        _this.dissRoomAnswer = 1;
                        _this.roomModel.onUserDissRoom();
                    }
                }
            }, 1500);
            
            // if (!_this.roomModel.isGaming)
            //     _this.roomModel.clearOutline();
        });
        //继续游戏，准备
        _this.socket.on("continueGame", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.currentState = structData.GAME_ST_READY;
            _this.roomModel.onUserContinue(_this.deskStation);
        })
        //用户发送聊天消息
        _this.socket.on("userChat", function (chatObj) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.roomModel.onUserChat(chatObj);
	    console.log("语音数据:"+JSON.stringify(chatObj));
        })
        //踢人
        _this.socket.on("kickUser", function (pos) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.roomModel.onKickUser(pos);
        })
        //解散房间投票
        _this.socket.on("dissolveRoom", function (answer) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.dissRoomAnswer = answer;
            _this.roomModel.onUserDissRoom();
        })
    }
    //处理玩家出牌
    onPlayCard(mahjongValue, isting) {
        this.mahjongList[mahjongValue]--;
        //  this.winList = upGradeLogic.getTingMahList(this.mahjongList);
        this.roomModel.userPlayCard(this.deskStation, mahjongValue);
        this.historyList.push(upGradeLogic.getMahData(mahjongValue));
        if (isting && !this.isTing) {
            this.isTing = true;
            this.roomModel.onUserTing(this.deskStation);
        }
        // console.log("玩家" + this.deskStation + "出牌:" + mahjongValue + "当前手牌：");
        // console.log(this.mahjongList);
    }
    //删除出牌记录中的牌
    deleteHistoryCard(mahjongValue) {
        var mahData = upGradeLogic.getMahData(mahjongValue);
        for (var i = 0; i < this.historyList.length; i++) {
            if (mahData.type == this.historyList[i].type && mahData.number == this.historyList[i].number) {
                this.historyList.splice(i, 1);
                break;
            }
        }
    }
    //处理特殊情况
    onDoSpecial(data) {
        this.haveSpecial = false;
        var doSpecialData = {};
        doSpecialData.deskStation = this.deskStation;
        doSpecialData.type = data.type; //1吃 2碰 3杠 4 胡 5 听
        doSpecialData.eatList = data.eatList; //吃的类型，0 吃头 1 吃中 2 吃尾
        doSpecialData.gangValue = data.gangValue;
        this.roomModel.doSpcialUserList.push(doSpecialData);
        this.roomModel.waitDoSpecialNum--;
        //    console.log("还需要执行的特殊情况数量：" + this.roomModel.waitDoSpecialNum);
        this.roomModel.userDoSpecial(this.deskStation,data.type);
    }
    //检查是否触发特殊情况
    checkSpecial(deskStation, mahjongValue) {
        this.checkResult = {};
        this.checkResult.data = {};
        this.checkResult.canPeng = this.isTing ? false : upGradeLogic.checkPeng(this.mahjongList, mahjongValue);
        if (this.checkResult.canPeng) {
            this.checkResult.data[2] = upGradeLogic.getMahData(mahjongValue);
            this.roomModel.waitDoSpecialList[this.deskStation].canPeng = true;
        }
        this.checkResult.canGang = this.isTing ? false : upGradeLogic.checkGang(this.mahjongList, mahjongValue);
        if (this.checkResult.canGang) {
            var pais = [upGradeLogic.getMahData(mahjongValue)];
            this.checkResult.data[25] = pais;
            this.roomModel.waitDoSpecialList[this.deskStation].canGang = true;
        }
        this.checkResult.canHu = (upGradeLogic.getTingMahList(this.mahjongList,this.roomModel.bao).indexOf(mahjongValue) != -1);
        if (this.checkResult.canHu) {
            this.checkResult.data[99] = upGradeLogic.getMahData(mahjongValue);
            this.roomModel.waitDoSpecialList[this.deskStation].canHu = true;
        }
        var canChi = false;
        if (!this.isTing) {
            if (upGradeLogic.isNextDesk(deskStation, this.deskStation)) {
                this.checkResult.canChiResult = upGradeLogic.checkChi(this.mahjongList, mahjongValue);
                if (this.checkResult.canChiResult.head || this.checkResult.canChiResult.middle || this.checkResult.canChiResult.end) {
                    canChi = true;
                    var pais = [];
                    if (this.checkResult.canChiResult.head) {
                        pais = pais.concat([upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue + 1), upGradeLogic.getMahData(mahjongValue + 2)]);
                    }
                    if (this.checkResult.canChiResult.middle) {
                        pais = pais.concat([upGradeLogic.getMahData(mahjongValue - 1), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue + 1)]);
                    }
                    if (this.checkResult.canChiResult.end) {
                        pais = pais.concat([upGradeLogic.getMahData(mahjongValue - 2), upGradeLogic.getMahData(mahjongValue - 1), upGradeLogic.getMahData(mahjongValue)]);
                    }
                    this.checkResult.data[1] = pais;
                    this.roomModel.waitDoSpecialList[this.deskStation].canChi = true;
                }
            }
        }

        if (this.checkResult.canGang || this.checkResult.canPeng || this.checkResult.canHu || canChi) {
            this.haveSpecial = true;
            this.roomModel.waitDoSpecialNum++;
            //      console.log("当前需要执行的特殊情况数量：" + this.roomModel.waitDoSpecialNum);
            this.socket.emit("doSelfSpecial", this.checkResult);
        }
    }
    //检查手牌
    checkMahList() {
        var checkResult = {};
        checkResult.data = {};
        var pais = [];
        for (var i = 0; i < this.mahjongList.length; i++) {
            if (this.mahjongList[i] == 4) {
                pais = pais.concat([upGradeLogic.getMahData(i), upGradeLogic.getMahData(i), upGradeLogic.getMahData(i), upGradeLogic.getMahData(i)]);
                checkResult.canGang = true;
            }
        }
        if (checkResult.canGang) {
            checkResult.data[24] = pais;
        }

        for (var i = 0; i < this.specialMahList.length; i++) {
            if ((this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[1]) && (this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[2]) && (this.specialMahList[i].moArr[0] == this.catchedPai)) {
                var pais = [upGradeLogic.getMahData(this.catchedPai)];
                checkResult.data[25] = pais;
                checkResult.canGang = true;
                break;
            }
        }
        var rest = upGradeLogic.getWinList(this.mahjongList,this.roomModel.bao);
        if (rest.length > 0 || rest == structData.QD || rest == structData.SBD) {
            checkResult.canHu = true;
            checkResult.data[99] = true;
        }
        var lizhitingList = [];
        if (!this.isTing) {
            lizhitingList = upGradeLogic.getLizhiList(this.mahjongList,this.roomModel.bao);
            if (lizhitingList.length > 0) {
                checkResult.lizhitingList = lizhitingList;
                checkResult.data[4] = lizhitingList;
            }
        }

        if (checkResult.canGang || checkResult.canHu || lizhitingList.length > 0) {
            this.roomModel.waitDoSpecialNum++;
            this.haveSpecial = true;
            this.socket.emit("doSelfSpecial", checkResult); //处理抓牌后的特殊情况
        } else {
            this.socket.emit("allowPushCard"); //允许出牌
        }

    }
    //碰、吃后检查是否听牌
    checkTing() {
        var checkResult = {};
        checkResult.data = {};
        var lizhitingList = [];
        if (!this.isTing) {
            lizhitingList = upGradeLogic.getLizhiList(this.mahjongList,this.roomModel.bao);
            if (lizhitingList.length > 0) {
                checkResult.lizhitingList = lizhitingList;
                checkResult.data[4] = lizhitingList;
            }
        }
        if (lizhitingList.length > 0) {
            this.roomModel.waitDoSpecialNum++;
            this.socket.emit("doSelfSpecial", checkResult); //处理抓牌后的特殊情况
        } else {
            this.socket.emit("allowPushCard"); //允许出牌
        }
    }
    //更新指定玩家亮出的牌
    updateUserSpecialList(deskStation, action, pai, chiPai) {
        this.checkResult = {};
        var res = {};
        res.turn = deskStation;
        var cur = {};
        for (var k in this.roomModel.userList) {
            cur[k] = this.roomModel.userList[k].roundScore;
        }
        res.cur = cur;
        res.action = action;
        res.pai = pai;
        res.chiPai = chiPai;
        // res.specialMahList = this.roomModel.userList[deskStation].specialMahList;
        this.socket.emit("updateSpecialList", res);
    }
    //执行特殊操作
    exectueSpecial(data, mahjongValue) {
        var pai = [];
        var chiPai = [];
        var actionData = {};
        switch (data.type) {
            case 1:
                actionData.action = 1;
                if (data.eatList.indexOf(mahjongValue) == 0) {
                    this.mahjongList[mahjongValue + 1]--;
                    this.mahjongList[mahjongValue + 2]--;
                    var moArr = [mahjongValue, mahjongValue + 1, mahjongValue + 2];
                    actionData.moArr = moArr;
                    pai = [upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue + 1, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue + 2, this.roomModel.currtPlayUser)]
                    chiPai = [upGradeLogic.getMahData(mahjongValue + 1, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue + 2, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)]
                } else if (data.eatList.indexOf(mahjongValue) == 1) {
                    this.mahjongList[mahjongValue - 1]--;
                    this.mahjongList[mahjongValue + 1]--;
                    var moArr = [mahjongValue - 1, mahjongValue, mahjongValue + 1];
                    actionData.moArr = moArr;
                    pai = [upGradeLogic.getMahData(mahjongValue - 1, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue + 1, this.roomModel.currtPlayUser)]
                    chiPai = [upGradeLogic.getMahData(mahjongValue - 1, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue + 1, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)]
                } else if (data.eatList.indexOf(mahjongValue) == 2) {
                    this.mahjongList[mahjongValue - 1]--;
                    this.mahjongList[mahjongValue - 2]--;
                    var moArr = [mahjongValue - 2, mahjongValue - 1, mahjongValue];
                    actionData.moArr = moArr;
                    pai = [upGradeLogic.getMahData(mahjongValue - 2, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue - 1, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)]
                    chiPai = [upGradeLogic.getMahData(mahjongValue - 2, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue - 1, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)]
                }
                this.specialMahList.push(actionData);
                this.roomModel.currtCatchUser = this.deskStation;
                this.roomModel.updateUserSpecialList(this.deskStation, 1, pai, chiPai);
                this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                this.checkTing();
                //回放动作数据
                var playbackChi = [chiPai[0],chiPai[1]];
                var actData = {action:actionData.action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai,resChi:playbackChi};
                this.roomModel.playback.actionList.push(actData);
                break;
            case 2:
                actionData.action = 2;
                this.mahjongList[mahjongValue] -= 2;
                var moArr = [mahjongValue, mahjongValue, mahjongValue];
                actionData.moArr = moArr;
                actionData.playUser = this.roomModel.currtPlayUser;
                this.specialMahList.push(actionData);
                pai = [upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)]
                this.roomModel.currtCatchUser = this.deskStation;
                this.roomModel.updateUserSpecialList(this.deskStation, 2, pai, chiPai);
                this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                this.checkTing();
                //回放动作数据
                var actData = {action:actionData.action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai};
                this.roomModel.playback.actionList.push(actData);
                break;
            case 3:
                var isBackHead = false; //是否是回头杠
                var action = 25;
                var hasobj = { 1: "roomcard", 2: "normal", 3: "middle", 4: "hight" };
                var roomcfg = think.config("roomcfg");
                var cfgData = roomcfg[hasobj[this.roomModel.roomType]];
                var baseScore = cfgData.baseScore;
                for (var i = 0; i < this.specialMahList.length; i++) {
                    if ((this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[1]) && (this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[2]) && (this.specialMahList[i].moArr[0] == this.catchedPai)) {
                        this.specialMahList[i].moArr.push(this.catchedPai);
                        this.specialMahList[i].action = 25;
                        isBackHead = true;
                        this.gangNum += 1;
                        this.roundScore += baseScore;
                        this.mahjongList[data.gangValue] -= 1;
                        pai = [upGradeLogic.getMahData(this.catchedPai), upGradeLogic.getMahData(this.catchedPai), upGradeLogic.getMahData(this.catchedPai), upGradeLogic.getMahData(this.catchedPai)]
                        // for(var k in this.roomModel.userList)
                        // {
                        //     if(k != this.deskStation)
                        //     {
                        //         this.roomModel.userList[k].gangNum--;
                        //         this.roomModel.userList[k].roundScore-=100;
                        //     }
                        // }
                        this.roomModel.userList[this.specialMahList[i].playUser].gangNum--;
                        this.roomModel.userList[this.specialMahList[i].playUser].roundScore -= baseScore;
                        break;
                    }
                }
                if (!isBackHead) {
                    action = (this.roomModel.currtCatchUser != this.deskStation && this.roomModel.currtCatchUser != 0) ? 25 : 24;
                    if (action == 24) {
                        this.gangNum += 3;
                        this.roundScore += 3 * baseScore;
                        for (var k in this.roomModel.userList) {
                            if (k != this.deskStation) {
                                this.roomModel.userList[k].gangNum--;
                                this.roomModel.userList[k].roundScore -= baseScore;
                            }
                        }
                        var moArr = [data.gangValue, data.gangValue, data.gangValue, data.gangValue];
                        actionData.action = 24;
                        actionData.moArr = moArr;
                        this.specialMahList.push(actionData);
                        pai = [upGradeLogic.getMahData(data.gangValue), upGradeLogic.getMahData(data.gangValue), upGradeLogic.getMahData(data.gangValue), upGradeLogic.getMahData(data.gangValue)];
                        this.mahjongList[data.gangValue] -= 4;
                    } else {
                        this.gangNum += 1;
                        this.roundScore += baseScore;
                        for (var k in this.roomModel.userList) {
                            if (k == this.roomModel.currtPlayUser) {
                                this.roomModel.userList[k].gangNum--;
                                this.roomModel.userList[k].roundScore -= baseScore;
                            }
                        }
                        var moArr = [mahjongValue, mahjongValue, mahjongValue, mahjongValue];
                        actionData.action = 25;
                        actionData.moArr = moArr;
                        this.specialMahList.push(actionData);
                        pai = [upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)];
                        this.mahjongList[mahjongValue] -= 3;
                        this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                    }
                }
                //回放动作数据
                var actData = {action:action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai};
                this.roomModel.playback.actionList.push(actData);

                this.roomModel.updateUserSpecialList(this.deskStation, action, pai, chiPai);
                this.setState(structData.GAME_ST_GETCARD);
                break;
            case 4:
                this.mahjongList[mahjongValue]++;
                this.roomModel.countResult(this.deskStation);
                break;
        }
    }
    //设置状态
    setState(state) {
        this.currentState = state;
        var _this = this;
        switch (this.currentState) {
            // case structData.GAME_ST_ONTURN:
            //     _this.socket.emit("onTurn"); //出牌状态
            //     break;
            // case structData.GAME_ST_WAIT_PLAY:
            //     _this.socket.emit("waitPlay"); //等待其他玩家操作
            //     break;
            case structData.GAME_ST_GETCARD:
                //流局
                if (_this.roomModel.mahjongStore.length == 0) {
                    _this.roomModel.gameEndWithHe();
                    return;
                }
                var mahjongNumber = 0;
                for(var i = 0; i < _this.mahjongList.length;i++)
                {
                    mahjongNumber += _this.mahjongList[i];
                }
                if(mahjongNumber >= 14) return;
                var cardValue = _this.roomModel.mahjongStore.shift();
                _this.mahjongList[cardValue]++;
                this.catchedPai = cardValue;
                this.roomModel.currtCatchUser = this.deskStation;
                //回放动作数据
                var actionData = {action:101,pos:this.deskStation,cardVal:cardValue};
                this.roomModel.playback.actionList.push(actionData);

                var obj = {};
                obj.pai = upGradeLogic.getMahData(cardValue);
                obj.dui_num = this.roomModel.mahjongStore.length;
                _this.socket.emit("getCard", obj);
                var otherObj = {};
                otherObj.pos = this.deskStation;
                otherObj.dui_num = this.roomModel.mahjongStore.length;
                otherObj.gang_end = true;
                for (var k in this.roomModel.userList) {
                    if (k != this.deskStation) {
                        if(!this.roomModel.userList[k].isbot)
                            this.roomModel.userList[k].socket.emit("otherGetCard", otherObj);
                    }
                }
                //       console.log("牌池剩余牌数：" + _this.roomModel.mahjongStore.length);
                break;
            case structData.GAME_ST_CHECK_MAH:
                //       this.checkMahList();
                break;
        }
    }
    //托管状态或者时间到了自动出牌
    autoPlay() {
        for (var i = 0; i < this.mahjongList.length; i++) {
            if (this.mahjongList[i] > 0) {
                this.mahjongList[i]--;
                this.roomModel.userPlayCard(this.deskStation, i);
                break;
            }
        }
    }
    //一局接受后清理数据
    clear() {
        this.currentState = structData.GAME_ST_WAIT;
        for (var i = 0; i < this.mahjongList.length; i++) {
            this.mahjongList[i] = 0;
        }
        this.specialMahList = [];
        this.roundScore = 0;
        this.isready = false;
        this.historyList = []; //出过的牌记录
        this.winList = []; //赢的牌列表
        this.catchedPai = -1; //刚抓到的牌
        this.gangNum = 0;
        this.huNum = 0;
        this.haveSpecial = false; //当前是否有待处理特殊情况
        this.isTing = false;
        this.winResultList = [];
        this.checkResult = {};
    }
    //展示结果
    showResult(result) {
        this.socket.emit("showResult", result);
    }
    //开始游戏
    startGame(szPoint, zDeskStation) {
        var res = {};
        res.data = {};
        res.data.szPoint = szPoint;
        res.data.zhuang = zDeskStation;
        res.data.mahjongList = this.mahjongList;
        res.data.dui_num = 67; //剩余牌的数量
        res.data.cur_round = this.roomModel.currentRound;
        res.data.max_round = this.roomModel.maxRound;
        res.data.bao = upGradeLogic.getMahData(this.roomModel.bao);
        //   this.setState((this.deskStation == zDeskStation) ? structData.GAME_ST_CHECK_MAH : structData.GAME_ST_WAIT_PLAY);
        res.data.state = this.currentState;
        res.data.cur = { "1": 0, "2": 0, "3": 0, "4": 0 };
        this.socket.emit("startGame", res);
        this.currentState = structData.GAME_ST_ONTURN;
        // console.log("玩家" + this.deskStation + "当前手牌：");
        // console.log(this.mahjongList);
    }
    //有玩家进入了房间
    onUserIn(roomData) {
        // var res = {};
        // res.deskStation = deskStation;
        // res.userData = userData;
        this.socket.emit("onUserIn", roomData);
    }
    //有玩家离开了房间
    onUserLeave(roomData) {
        // var res = {};
        // res.deskStation = deskStation;
        this.socket.emit("onUserLeave", roomData);
    }
    //清理总牌局记录
    clearRoundRecord(){
        this.totalScore = 0; //在本房间内的输赢情况
        this.pao_num = 0; //在本房间总共放炮的次数
        this.zhuang_num = 0; //坐庄次数
        this.hu_num = 0; //胡次数
        this.socket = null;
        this.roomModel = null;
        this.currentState = structData.GAME_ST_READY;
    }
    //重置牌局记录
    resetRoundRecord(){
        this.totalScore = 0; //在本房间内的输赢情况
        this.pao_num = 0; //在本房间总共放炮的次数
        this.zhuang_num = 0; //坐庄次数
        this.hu_num = 0; //胡次数
    }
    dispose() {
        this.clear();
        this.clearRoundRecord();
    }
}