var structData = require("./../config/structdata");
//普通麻将牌
var allMahjongList = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          27,28,29,30,31,32,33,27,28,29,30,31,32,33,27,28,29,30,31,32,33,27,28,29,30,31,32,33];
                          
//白城麻将牌(没有东南西北，有中发白)
var allMahjongList_bc = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                          27,28,29,27,28,29,27,28,29,27,28,29];
//不带风(只有饼万条)
var allMahjongList_xlch = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                               0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                               0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
                               0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26];
//胡牌类型对应的番数
var fanConfig = {1:88,2:64,3:48,4:48,5:24,6:24,8:24,9:16,10:16,11:16,12:8,13:6,14:6,15:4,16:1,17:1,18:1,19:32,21:20};

exports.TYPE_NORMAL = 1; //普通场
exports.TYPE_XLCH = 2; //血流成河
var gameType = 1;
exports.socketioProxy = null;

//获取麻将牌
exports.getAllMahjong = function (type = 1) {
    gameType = type;
    var mahjongList;
    if(type == 1)
    {
        mahjongList = [].concat(allMahjongList_bc);
    }else if(type == 2)
    {
        mahjongList = [].concat(allMahjongList_xlch);
    }
    mahjongList.sort(function(a,b){
        return Math.random() > 0.5 ? -1 : 1;
    })
    return mahjongList;
}
//测试数据
exports.getTestMahjong = function()
{
    var testMahjongList = [29,29,0,0,1,1,1,1,2,2,2,2,3,3,3,29,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9,10,10,10,10,11,11,11,11,12,12,12,12,13,13,13,13,14,29,14,14,15,15,15,15,16,16,16,16,
                           17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,22,22,22,22,23,23,23,23,24,24,24,24,25,25,25,25,26,26,26,26,27,27,27,27,28,28,28,28,14,3,0,0];
    return testMahjongList;
}

var mahjongSetList = {};
//设置玩家初始牌
exports.setUserMahJong = function(req,res){
    var setList = JSON.parse(req.body.setList);
    var roomId = req.body.roomId;
    var allMahjongList = [].concat(allMahjongList_bc);
    var mahjongList = [];
    var zDeskStation = 0;
    for(var i = 0; i < setList.length;i++)
    {
        if(setList[i].length == 14) zDeskStation = i+1;
        for(var j = 0; j < setList[i].length;j++)
        {
            var mahjongValue = setList[i][j];
            var index = allMahjongList.indexOf(mahjongValue);
            if(index != -1)
                allMahjongList.splice(index,1);
            mahjongList.push(mahjongValue);
        }
    }
    allMahjongList.sort(function(a,b){
        return Math.random() > 0.5 ? -1 : 1;
    })
    mahjongList = mahjongList.concat(allMahjongList);
    mahjongSetList[roomId] = {};
    mahjongSetList[roomId].setZhuang = zDeskStation;
    mahjongSetList[roomId].mahjongSetList = mahjongList;
    var resData = {};
    resData.action = "setRoomCard";
    resData.msg = "设置成功";
    res.end(JSON.stringify(resData));
}
//获取设置的麻将牌
exports.getRoomSetMahList = function(roomId){
    return mahjongSetList[roomId];
}
//删除设置的牌
exports.removeRoomSetMahList = function(roomId){
    delete mahjongSetList[roomId];
}

//检查手牌，获取胡牌的全部牌型
function getWinMahJongList(mahjongList){
    var listBak = [].concat(mahjongList);
    var jongList = []; //可以作为对子的牌
    var winResultList = []; //胡牌的所有情况
    var duiziNum = 0; //区别于将，用以七对判断
    for(var i = 0; i < listBak.length;i++)
    {
        if(listBak[i] >= 2)
        {
            jongList.push(i);
            duiziNum++;
            if(listBak[i] == 4)
                duiziNum++;
        }
    }
    if(jongList.length == 0) return false;
    //七对判断
    if(duiziNum == 7)
    {
        // for (var i = 0; i < mahjongList.length; i++) {
        //     if (mahjongList[i] > 0) {
        //         winResultList.push(i);
        //     }
        // }
        return structData.QD;
    }

    for(var i = 0; i < jongList.length;i++)
    {
        var jongValue = jongList[i];
        var result = {};
        result.jongValue = jongValue; //对子
        result.moList = []; //普通三张牌组
        var noJongList = [].concat(listBak);
        noJongList[jongValue] -= 2;
        var checkIndex = 0;
        var checkLen = (gameType == 1 ? 29 : 26); 
        (function checkNoJongList(checkIndex){
            if(checkIndex > checkLen) return;
            var checkValue = noJongList[checkIndex];
            if(checkValue == 0)
            {
                checkIndex++;
            }else if(checkValue < 3)
            {
                if (checkIndex == 7 || checkIndex == 8 || checkIndex == 16 || checkIndex == 17 || checkIndex == 25 || checkIndex >= 26) {
                    checkIndex++;
                }else
                {
                    if (noJongList[checkIndex + 1] < checkValue || noJongList[checkIndex + 2] < checkValue) return;
                    for (var j = 0; j < checkValue; j++) {
                        var moArr = [checkIndex, checkIndex + 1, checkIndex + 2];
                        result.moList.push(moArr);
                    }
                    noJongList[checkIndex] -= checkValue;
                    noJongList[checkIndex + 1] -= checkValue;
                    noJongList[checkIndex + 2] -= checkValue;
                    checkIndex++;
                }
                
            }else if(checkValue == 3)
            {
                if (checkIndex == 7 || checkIndex == 8 || checkIndex == 16 || checkIndex == 17 || checkIndex == 25 || checkIndex >= 26)
                {
                    var moArr = [checkIndex,checkIndex,checkIndex];
                    result.moList.push(moArr);
                    noJongList[checkIndex] -= checkValue;
                    checkIndex++;
                }else
                {
                    if (noJongList[checkIndex + 1] >= checkValue && noJongList[checkIndex + 2] >= checkValue)
                    {
                        for (var j = 0; j < checkValue; j++) {
                            var moArr = [checkIndex, checkIndex + 1, checkIndex + 2];
                            var keArr = [checkIndex + j,checkIndex + j,checkIndex + j];
                            result.moList.push(keArr);
                        }
                        noJongList[checkIndex] -= checkValue;
                        noJongList[checkIndex + 1] -= checkValue;
                        noJongList[checkIndex + 2] -= checkValue;
                        checkIndex++;
                    }else
                    {
                        var moArr = [checkIndex,checkIndex,checkIndex];
                        result.moList.push(moArr);
                        noJongList[checkIndex] -= checkValue;
                        checkIndex++;
                    }
                }
            }else if(checkValue == 4)
            {
                if (checkIndex == 7 || checkIndex == 8 || checkIndex == 16 || checkIndex == 17 || checkIndex == 25 || checkIndex >= 26) {
                    if(checkIndex > 26) return;
                    checkIndex++;
                }else
                {
                    if (noJongList[checkIndex + 1] < 1 || noJongList[checkIndex + 2] < 1) return;
                    var moArr = [checkIndex, checkIndex + 1, checkIndex + 2];
                    result.moList.push(moArr);
                    noJongList[checkIndex] -= 1;
                    noJongList[checkIndex + 1] -= 1;
                    noJongList[checkIndex + 2] -= 1;
                 //   checkIndex++;
                }
            }else
            {
                return;
            }
            checkNoJongList(checkIndex);
        })(checkIndex);
        var cardNum = 0;
        for(var j = 0;j < mahjongList.length;j++)
        {
            cardNum += mahjongList[j];
        }
        if(result.moList.length * 3 + 2 == cardNum)
        {
            winResultList.push(result);
        }
    }
    return winResultList;
}
//带百搭牌的胡牌判断
function getWinListByWild(mahjonglist,wild = -1,checkwild = false){
    var listBak = [].concat(mahjonglist);
    var winResultList = []; //胡牌的所有情况
    var duiziNum = 0; //区别于将，用以七对判断
    var wildNumber = listBak[wild]; //百搭数
    if(checkwild)
        wildNumber--; //将一个百搭用作普通牌
    if(wild == -1 || wildNumber == 0)
        return getWinMahJongList(mahjonglist);
    if(wildNumber == 4)
    {
        return structData.SBD;
    }
       
    for(var i = 0; i < listBak.length;i++)
    {
        if(listBak[i] >= 2 && wild != i)
        {
            duiziNum++;
            if(listBak[i] == 4)
                duiziNum++;
        }
    }
    //七对牌型判断
    if(duiziNum + wildNumber >= 7)
    {
        return structData.QD;
    }
    var moList = []; //已经成顺子或刻的
    var nearList = []; //两张挨着的牌
    var otherList = []; //剩余杂牌
    for(var i = 0; i < listBak.length;i++)
    {
        if(listBak[i] == 1 && i != wild)
        {
            if(i-1 > 0 && i < listBak.length-2)
            {
                if(listBak[i-1] == 0 && listBak[i-2] == 0 && listBak[i+1] == 0 && listBak[i+2] == 0)
                    otherList.push(i);
            }else if(i == 0 && listBak[i+1] == 0 && listBak[i+2] == 0)
            {
                otherList.push(i);
            }else if(i == 1 && listBak[i-1] == 0 && listBak[i+1] == 0 && listBak[i+2] == 0)
            {
                otherList.push(i);
            }else if(i == listBak.length - 1 && listBak[i-1] == 0 && listBak[i-2] == 0)
            {
                otherList.push(i);
            }else if(i == listBak.length - 2 && listBak[i+1] == 0 && listBak[i-1] == 0 && listBak[i-2] == 0)
            {
                otherList.push(i);
            }
        }
    }
    if(otherList.length > 2)
        return false;
    if(otherList.length == 2 && wildNumber < 3) return false;
    if(otherList.length == 1)
    {
        listBak[wild]--;
        wildNumber--;
        listBak[otherList[0]]++;
    }else if(otherList.length == 2)
    {
        listBak[wild] -= 3;
        wildNumber-=3;
        listBak[otherList[0]]++;
        listBak[otherList[1]]+=2;
    }
    if(wildNumber == 0) return getWinMahJongList(listBak);
    for(var i = 0; i < listBak.length;i++)
    {
        if(listBak[i] == 1 && i != wild)
        {
            var res = checkAroundNum(listBak,i);
            if(res!= -1)
            {
                listBak[wild]--;
                wildNumber--;
                listBak[res]++;
                if(wildNumber == 0) return getWinMahJongList(listBak);
            }
        }
    }
    
    if (wildNumber == 1) {
        for (var j = 0; j < listBak.length; j++) {
            var res = checkAroundEmpty(listBak, j);
            if (res && listBak[j] == 0) continue;
            var tempList = [].concat(listBak);
            tempList[j]++;
            tempList[wild]--;
            var result = getWinMahJongList(tempList);
            if(result.length > 0)
                winResultList = winResultList.concat(result);
        }
    }else if(wildNumber == 2)
    {
        for(var i = 0; i < listBak.length;i++)
        {
            var res = checkAroundEmpty(listBak, i);
            if (res && listBak[i] == 0) continue;
            var tempListI = [].concat(listBak);
            tempListI[i]++;
            tempListI[wild]--;
            for(var j = 0; j < listBak.length;j++)
            {
                var resj = checkAroundEmpty(listBak, j);
                if (resj && listBak[j] == 0) continue;
                var tempListJ = [].concat(tempListI);
                tempListJ[j]++;
                tempListJ[wild]--;
                var result = getWinMahJongList(tempListJ);
                if(result.length > 0)
                    winResultList = winResultList.concat(result);
            }
        }
    }else if(wildNumber == 3)
    {
        for(var i = 0; i < listBak.length;i++)
        {
            var res = checkAroundEmpty(listBak, i);
            if (res && listBak[i] == 0) continue;
            var tempListI = [].concat(listBak);
            tempListI[i]++;
            tempListI[wild]--;
            for(var j = 0; j < listBak.length;j++)
            {
                var resj = checkAroundEmpty(listBak, j);
                if (resj && listBak[j] == 0) continue;
                var tempListJ = [].concat(tempListI);
                tempListJ[j]++;
                tempListJ[wild]--;
                for(var k = 0;k <listBak.length;k++)
                {
                    var resk = checkAroundEmpty(listBak, k);
                    if (resk && listBak[k] == 0) continue;
                    var tempListK = [].concat(tempListJ);
                    tempListK[k]++;
                    tempListK[wild]--;
                    var result = getWinMahJongList(tempListK);
                    if(result.length > 0)
                        winResultList = winResultList.concat(result);
                }
            }
        }
    }
    return winResultList;
}
//检查周围临近牌的情况
function checkAroundNum(list,index){
    if(index == 0)
    {
        if(list[index + 1] > 0 && list[index + 2] == 0)
            return index + 2;
        if(list[index + 1] == 0 && list[index + 2] > 0)
            return index + 1;
    }else if(index == 1)
    {
        if(list[index - 1] > 0 && list[index + 1] == 0 && list[index + 2] == 0)
            return index + 1;
        if(list[index - 1] == 0 && list[index + 1] > 0 && list[index + 2] == 0)
            return index - 1;
        if(list[index - 1] == 0 && list[index + 1] == 0 && list[index + 2] > 0)
            return index + 1;
    }else if(index == list.length - 1)
    {
        if(list[index - 1] > 0 && list[index - 2] == 0)
            return index - 2;
        if(list[index - 1] == 0 && list[index - 2] > 0)
            return index - 1;
    }else if(index == list.length - 2)
    {
        if(list[index + 1] > 0 && list[index - 1] == 0 && list[index - 2] == 0)
            return index - 1;
        if(list[index + 1] == 0 && list[index - 1] > 0 && list[index - 2] == 0)
            return index + 1;
        if(list[index + 1] == 0 && list[index - 1] == 0 && list[index - 2] > 0)
            return index - 1;
    }else
    {
        if(list[index - 2] > 0 && list[index - 1] == 0 && list[index + 1] == 0 && list[index + 2] == 0)
            return index - 1;
        if(list[index - 2] == 0 && list[index - 1] > 0 && list[index + 1] == 0 && list[index + 2] == 0)
            return index + 1;
        if(list[index - 2] == 0 && list[index - 1] == 0 && list[index + 1] > 0 && list[index + 2] == 0)
            return index - 1;
        if(list[index - 2] == 0 && list[index - 1] == 0 && list[index + 1] == 0 && list[index + 2] > 0)
            return index + 1;
    }
    return -1;
}

//检查周围是否有牌
function checkAroundEmpty(list,index){
    if(index == 0)
    {
        if(list[index + 1] == 0 && list[index + 2] == 0)
            return true;
    }else if(index == 1)
    {
        if(list[index - 1] == 0 && list[index + 1] == 0 && list[index + 2] == 0)
            return true;
    }else if(index == list.length - 1)
    {
        if(list[index - 1] == 0 && list[index - 2] == 0)
            return true;
    }else if(index == list.length - 2)
    {
        if(list[index + 1] == 0 && list[index - 1] == 0 && list[index - 2] == 0)
            return true;
    }else
    {
        if(list[index - 2] == 0 && list[index - 1] == 0 && list[index + 1] == 0 && list[index + 2] == 0)
            return true;
    }
    return false;
}

//获取胡牌列表
exports.getWinList = function(mahjongList,wild = -1){
   // return getWinMahJongList(mahjongList);
   return getWinListByWild(mahjongList,wild);
}

//获取听牌列表
function getTingList(mahjongList,wild = -1)
{
    var mahJongLen = (gameType == 1 ? 30 : 27);
    var tingList = [];
    for(var i = 0; i < mahJongLen; i++)
    {
        var iswild = (i == wild) ? true : false;
        var tempCheckList = [].concat(mahjongList);
        if(tempCheckList[i] < 4) tempCheckList[i]++;
      //  var checkResult = getWinMahJongList(tempCheckList);
        var checkResult = getWinListByWild(tempCheckList,wild,iswild);
        if(checkResult.length > 0 || checkResult == structData.QD || checkResult == structData.SBD)
        {
            tingList.push(i);
        }
    }
    return tingList;
}
//获取听牌后赢的牌列表
exports.getTingMahList = function(mahjongList,wild = -1)
{
    return getTingList(mahjongList,wild);
}

//获取打出听的牌及对应的胡牌列表
exports.getLizhiList = function(mahjongList,wild = -1)
{
    // var beginTime = new Date().getTime();
    // console.log("beginTime:" + beginTime);
    var resultList = [];
    for(var i = 0; i < mahjongList.length;i++)
    {
        if(mahjongList[i] == 0) continue;
        var tempCheckList = [].concat(mahjongList);
        tempCheckList[i]--;
        var tinglist = getTingList(tempCheckList,wild);
        if(tinglist.length > 0)
        {
            var result = {};
            result.mahjongValue = i;
            result.tinglist = tinglist;
            resultList.push(result);
        }
    }
    // var endTime = new Date().getTime();
    // console.log("endTime:" + endTime);
    return resultList;
}
//碰牌检测
exports.checkPeng = function(mahjongList,mahjongValue)
{
    return (mahjongList[mahjongValue] >= 2) ? true : false;
}
//杠牌检测
exports.checkGang = function(mahjongList,mahjongValue)
{
    return (mahjongList[mahjongValue] >= 3) ? true : false;
}
//吃牌检测
exports.checkChi = function(mahjongList,mahjongValue)
{
    var result = {head:false,middle:false,end:false};
    if(mahjongValue < 27)
    {
        if(mahjongValue == 0 || mahjongValue == 9 || mahjongValue == 18)
        {
            if(mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 2] > 0)
                result.head = true;
        }else if(mahjongValue == 1 || mahjongValue == 10 || mahjongValue == 19)
        {
            if(mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 2] > 0)
                result.head = true;
            if(mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0)
                result.middle = true;
        }else if(mahjongValue == 8 || mahjongValue == 17 || mahjongValue == 26)
        {
            if(mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0)
                result.end = true;
        }else if(mahjongValue == 7 || mahjongValue == 16 || mahjongValue == 25)
        {
            if(mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0)
                result.end = true;
            if(mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0)
                result.middle = true;
        }else
        {
            if(mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0)
                result.end = true;
            if(mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0)
                result.middle = true;
            if(mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 2] > 0)
                result.head = true;
        }
    }
    return result;
}
//判断是否为下家
exports.isNextDesk = function(myDesk,otherDesk){
    if(myDesk == 4 && otherDesk == 1) return true;
    return (otherDesk - myDesk) == 1; 
}

//将服务器数据转换为显示数据
exports.getMahData = function(mahjongValue,pos = -1){
        return getMahDataInner(mahjongValue,pos);
}
//得到服务器需要的数据
exports.getMahjongValue = function(paiData){
		var mahjongValue = (paiData.type - 1) * 9 + (paiData.number - 1);
		return mahjongValue;
}
//将服务器数据转换为显示数据
function getMahDataInner(mahjongValue,pos = -1){
    var mahData = {};
	mahData.type = Math.floor(mahjongValue / 9) + 1;
	mahData.number = (mahjongValue % 9) + 1;
    mahData.pos = pos;
	return mahData;
}
//牌型判断
exports.getResultFan = function(handCardList,specialCardList,wintype,wild = -1,lastPlayCard = -1){
    var result = {};
    var allResult = [];
    var checkList = [].concat(handCardList);
    if(lastPlayCard != -1) checkList[lastPlayCard]++;
    var handcardWinList = getWinListByWild(checkList,wild);
    var gangNum = 0;
    var anKeNum = 0; //暗刻的数量
    var keNum = 0; //刻的数量，包括暗刻明刻
    var specialIsQing = true; //特殊牌是否是清一色
    var specialQingType = -1;
    var isHaveFeng = false;
    var typeList = [1,2,3];//和牌时拥有的门数
    //四百搭
    if(handcardWinList == structData.SBD)
    {
        result.fanList = [structData.SBD];
        result.fan = 20 + 1;
        return result;
    }
    //七对
    if(handcardWinList == 6)
    {
        result.fanList = [structData.QD];
        result.fan = 24 + 1;
        if(wintype == 1)
        {
            result.fanList.push(structData.BQR);
            result.fan += fanConfig[structData.BQR];
        }
        for(var i = 0; i < checkList.length;i++)
        {
            if(checkList[i] > 0)
            {
                var mahType = getMahDataInner(i).type;
                var typeIndex = typeList.indexOf(mahType);
                if(mahType == 4) isHaveFeng = true;
                if(typeIndex != -1)
                    typeList.splice(typeIndex,1);
            }
        }
        if(typeList.length == 2)
        {
             if(isHaveFeng)
            {
                result.fanList.push(structData.HYS)
                result.fan += fanConfig[structData.HYS];
            }else
            {
                result.fanList.push(structData.QYS)
                result.fan += fanConfig[structData.QYS];
            }
        }else if(typeList.length == 1)
        {
            result.fanList.push(structData.QYM)
            result.fan += fanConfig[structData.QYM];
            
            if (!isHaveFeng) {
                result.fanList.push(structData.WZ)
                result.fan += fanConfig[structData.WZ];
            }
        }

        return result;
    }
    
    for(var i = 0; i < specialCardList.length;i++)
    {
        if(getMahDataInner(specialCardList[i].moArr[0]).type != 4)
        {
            specialQingType = getMahDataInner(specialCardList[i].moArr[0]).type;
            break;
        }
    }

    for(var i = 0; i < specialCardList.length;i++)
    {
        if(specialCardList[i].action == 24 || specialCardList[i].action == 25)
            gangNum++;
        if(specialCardList[i].action == 24) anKeNum++;
        if(getMahDataInner(specialCardList[i].moArr[0]).type == 4)
            isHaveFeng = true;
        // if(getMahDataInner(specialCardList[i].moArr[0]).type != specialQingType && getMahDataInner(specialCardList[i].moArr[0]).type != 4)
        //     specialIsQing = false;
        if(specialCardList[i].moArr[0] == specialCardList[i].moArr[1]) keNum++;
        var typeIndex = typeList.indexOf(getMahDataInner(specialCardList[i].moArr[0]).type);
        if(typeIndex != -1)
            typeList.splice(typeIndex,1);
    }
    
    for(var i = 0; i < handcardWinList.length;i++)
    {
        var typeIndex = typeList.indexOf(getMahDataInner(handcardWinList[i].jongValue).type);
        if(typeIndex != -1)
            typeList.splice(typeIndex,1);
        var moList = handcardWinList[i].moList;
        var handAnkNum = 0;
        var tempResult = {};
        tempResult.fanList = [];
        tempResult.fan = 1;
        var qingType = getMahDataInner(handcardWinList[i].jongValue).type;
        if(qingType == 4) isHaveFeng = true;
        for(var j = 0; j < moList.length;j++)
        {
            if(getMahDataInner(moList[j][0]).type != 4)
            {
                qingType = getMahDataInner(moList[j][0]).type;
                break;
            }
              
        }
        var isQing = true;
        if(specialCardList.length == 0 && wintype == 1) 
        {
            tempResult.fanList.push(structData.BQR);
            tempResult.fan += fanConfig[structData.BQR];
        }
        if (gangNum == 4) {
            tempResult.fanList.push(structData.SG);
            tempResult.fan += fanConfig[structData.SG];
        } else if (gangNum == 3) {
            tempResult.fanList.push(structData.SANG);
            tempResult.fan += fanConfig[structData.SANG];
        }
        for(var j = 0; j < moList.length;j++)
        {
            if((moList[j][0] == moList[j][1]) && (moList[j][1] == moList[j][2]))
                handAnkNum++;
            if(getMahDataInner(moList[j][0]).type == 4)
                isHaveFeng = true;
            // if(getMahDataInner(moList[j][0]).type != qingType && getMahDataInner(moList[j][0]).type != 4 && qingType != 4)
            //     isQing = false;
            
            var typeIndex = typeList.indexOf(getMahDataInner(moList[j][0]).type);
            if(typeIndex != -1)
                typeList.splice(typeIndex,1);
        }
        if((anKeNum + handAnkNum) == 4 && gangNum != 4)
        {
            tempResult.fanList.push(structData.SAK);
            tempResult.fan += fanConfig[structData.SAK];
        } 
        if((anKeNum + handAnkNum) == 3 && gangNum != 3)
        {
            tempResult.fanList.push(structData.SANAK);
            tempResult.fan += fanConfig[structData.SANAK];
        } 
        if(typeList.length >= 2)
        {
            if(isHaveFeng)
            {
                tempResult.fanList.push(structData.HYS)
                tempResult.fan += fanConfig[structData.HYS];
            }else
            {
                tempResult.fanList.push(structData.QYS)
                tempResult.fan += fanConfig[structData.QYS];
            }
        }else
        {
            if(typeList.length > 0)
            {
                tempResult.fanList.push(structData.QYM)
                tempResult.fan += fanConfig[structData.QYM];
            }
            if (!isHaveFeng) {
                tempResult.fanList.push(structData.WZ)
                tempResult.fan += fanConfig[structData.WZ];
            }
        }
        if((keNum + handAnkNum) == 4 && (anKeNum + handAnkNum) != 4 && gangNum != 4)
        {
            tempResult.fanList.push(structData.PPH)
            tempResult.fan += fanConfig[structData.PPH];
        }
        allResult.push(tempResult);
    }
    allResult.sort(function(a,b){
        return a.fan > b.fan ? -1 : 1;
    })

    return allResult[0];
}