//~~~~~~~~~~~游戏状态
exports.GAME_ST_WAIT = 0; //等待状态
exports.GAME_ST_READY = 1; //准备状态
exports.GAME_ST_GETCARD = 2;//抓牌状态
exports.GAME_ST_CHECK_MAH = 3; //检查手牌
exports.GAME_ST_ONTURN = 4; //出牌状态
exports.GAME_ST_WAIT_PLAY = 5; //等待其他玩家操作
exports.GAME_ST_SPECIAL = 6; //处理特殊情况，吃，碰，杠，胡
exports.GAME_ST_OUT = 7; //托管

//房间状态
exports.ROOM_ST_WAIT_JOIN = "wait_for_join"; //等待玩家加入
exports.ROOM_ST_WAIT_PLAY = "wait_for_play"; //等待开始游戏
exports.ROOM_ST_WAIT_START = "wait_for_start"; //等待房主开始游戏
exports.ROOM_ST_WAIT_DEAL = "wait_for_deal"; //等待发牌
exports.ROOM_ST_WAIT_RESUME = "wait_for_resume"; //等待重新开始
exports.ROOM_ST_WAIT_DISMISS = "wait_for_dismiss"; //等待解散房间
exports.ROOM_ST_WAIT_WAKE = "wait_for_wake"; //等待激活房间
exports.ROOM_ST_WAIT_CONTINUE = "wait_for_continue"; //等待继续游戏

//胡牌类型
exports.SG = 1; //四个杠，不计碰碰胡、三杠、双暗杠、双明杠，明杠、暗杠、单调将
exports.SAK = 2; //四暗刻，不计门前清、碰碰和
exports.YSSTS = 3; //一色四同顺，一种花色4副序数相同的顺子，不计一色三节高、一般高、四归一、平胡
exports.YSSJG = 4; //一色四节高，一种花色4副依次递增一位数的刻子不计一色三同顺、碰碰和
exports.SANG = 19; //三个杠，不计双暗杠，双明杠，暗杠，明杠
exports.QYS = 5; //清一色
exports.QD = 6; //七对
exports.ZM = 7; //自摸
exports.YSTJG = 8; //一色三节高，和牌时有一种花色3副依次递增一位数字的刻子。不计一色三同顺
exports.QINGLONG = 9; //清龙，和牌时，有一种花色1-9相连接的序数牌
exports.STK = 10; //三同刻，3个序数相同的刻子(杠)
exports.SANAK = 11; //三暗刻，三个暗刻，不计双暗刻
exports.GSKH = 12; //杠上开花
exports.PPH = 13; //碰碰胡，由4副刻子(或杠)、将牌组成的和牌
exports.HYS = 14; //混一色
exports.BQR = 15; //不求人
exports.QYM = 16; //缺一门
exports.DP = 17; //点炮
exports.WZ = 18; //无字
exports.TING = 20; //听牌
exports.SBD = 21; //四个百搭
