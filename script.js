// -----------------------------
// Firebase 設定（compat 可執行於 GitHub Pages）
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCk54DEp6rzvpfQBBNW_iJByZ3boyHEPF0",
  authDomain: "poolpokergame-b88ed.firebaseapp.com",
  databaseURL: "https://poolpokergame-b88ed-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "poolpokergame-b88ed",
  storageBucket: "poolpokergame-b88ed.appspot.com",
  messagingSenderId: "574863840102",
  appId: "1:574863840102:web:14368aaf84b3640c6eeea7"
};

// 初始化 Firebase（compat）
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// -----------------------------
// DOM 元素
// -----------------------------
const loginDiv = document.getElementById('loginDiv');
const gameDiv = document.getElementById('gameDiv');
const nicknameInput = document.getElementById('nickname');
const joinBtn = document.getElementById('joinBtn');
const totalPlayersSel = document.getElementById('totalPlayersSel');
const setTotalBtn = document.getElementById('setTotalBtn');
const startGameBtn = document.getElementById('startGameBtn');
const restartBtn = document.getElementById('restartBtn');
const notice = document.getElementById('notice');
const numButtonsDiv = document.getElementById('numButtons');
const playerCardsDiv = document.getElementById('playerCards');

// -----------------------------
// 全域變數
// -----------------------------
let myId = 'player_' + Math.random().toString(36).substr(2, 9);
let myNickname = '';
let gameRef = db.ref('games/main_pool_game_demo');
let gameStarted = false;

// -----------------------------
// 撞球顏色按鈕
// -----------------------------
const ballColors = {
  1:'yellow', 2:'blue', 3:'red', 4:'purple', 5:'orange', 6:'green', 7:'brown', 8:'black',
  9:'linear-gradient(to right, yellow, white)', 
  10:'linear-gradient(to right, blue, white)',
  11:'linear-gradient(to right, red, white)', 
  12:'linear-gradient(to right, purple, white)',
  13:'linear-gradient(to right, orange, white)'
};

// 建立 1~13 號按鈕
for(let i=1;i<=13;i++){
  const btn = document.createElement('button');
  btn.textContent = i;
  btn.className = 'num-btn';
  btn.style.background = ballColors[i];
  btn.style.color = (i <= 8 ? 'black' : 'white');
  btn.addEventListener('click', ()=>markNumber(i));
  numButtonsDiv.appendChild(btn);
}

// -----------------------------
// ① 加入房間
// -----------------------------
joinBtn.addEventListener('click', async () => {
  const nickname = nicknameInput.value.trim();
  if(!nickname){
    notice.textContent = '請輸入暱稱';
    return;
  }
  myNickname = nickname;

  const snap = await gameRef.get();

  if(!snap.exists()){
    // 房主建立房間
    await gameRef.set({
      creatorId: myId,
      totalPlayers: 2,
      gameStarted: false,
      cardsPerPlayer: 5,
      players: {
        [myId]: {
          nickname,
          cards: [],
          marked: []
        }
      }
    });
  } else {
    const g = snap.val();

    if(g.players && Object.keys(g.players).length >= 5){
      notice.textContent = '房間已滿';
      return;
    }

    await gameRef.child('players/' + myId).set({
      nickname,
      cards: [],
      marked: []
    });
  }

  loginDiv.style.display = 'none';
  gameDiv.style.display = 'block';
  notice.textContent = '歡迎 ' + nickname + '！';
});

// -----------------------------
// ② 設定總玩家數（房主限定）
// -----------------------------
setTotalBtn.addEventListener('click', async () => {
  const v = parseInt(totalPlayersSel.value);
  if(v < 1 || v > 5){
    notice.textContent = '玩家數需為 1~5';
    return;
  }

  const snap = await gameRef.get();
  const g = snap.val();

  if(g.creatorId !== myId){
    notice.textContent = '只有房主能設定玩家數';
    return;
  }

  await gameRef.update({ totalPlayers: v });
  notice.textContent = `總玩家數已更新為 ${v}`;
});

// -----------------------------
// ③ 開始遊戲（房主）
// -----------------------------
startGameBtn.addEventListener('click', async () => {
  const snap = await gameRef.get();
  const g = snap.val();
  if(!g){
    notice.textContent = '房間不存在';
    return;
  }

  if(g.creatorId !== myId){
    notice.textContent = '只有房主可以開始遊戲';
    return;
  }

  const playerIds = Object.keys(g.players);
  const count = playerIds.length;

  if(count === 0){
    notice.textContent = '沒有玩家加入';
    return;
  }

  const cardsPerPlayer = g.cardsPerPlayer || 5;

  // 52 張牌 = 1~13 四份
  let deck = [];
  for(let i=1;i<=13;i++){
    deck.push(i,i,i,i);
  }

  // 洗牌
  deck = deck.sort(()=>Math.random() - 0.5);

  let newPlayers = {};
  for(let i=0;i<count;i++){
    const pid = playerIds[i];
    newPlayers[pid] = {
      ...g.players[pid],
      cards: deck.slice(i*cardsPerPlayer, (i+1)*cardsPerPlayer),
      marked: []
    };
  }

  await gameRef.update({
    players: newPlayers,
    gameStarted: true
  });

  notice.textContent = '遊戲開始！';
});

// -----------------------------
// ④ 重新開局
// -----------------------------
restartBtn.addEventListener('click', async () => {
  const snap = await gameRef.get();
  const g = snap.val();

  if(g.creatorId !== myId){
    notice.textContent = '只有房主可重新開局';
    return;
  }

  let emptyPlayers = {};
  for(const pid in g.players){
    emptyPlayers[pid] = {
      nickname: g.players[pid].nickname,
      cards: [],
      marked: []
    };
  }

  await gameRef.update({
    players: emptyPlayers,
    gameStarted: false
  });

  notice.textContent = '已重新開局';
});

// -----------------------------
// ⑤ 標註號碼（任意玩家）
// -----------------------------
async function markNumber(num){
  const snap = await gameRef.get();
  const g = snap.val();

  if(!g.gameStarted){
    notice.textContent = '遊戲尚未開始';
    return;
  }

  const myData = g.players[myId];

  if(!myData.marked.includes(num)){
    myData.marked.push(num);
    await gameRef.child("players/" + myId).update({
      marked: myData.marked
    });
  }
}

// -----------------------------
// ⑥ 監聽遊戲資料更新（同步畫面）
// -----------------------------
gameRef.on('value', snap => {
  const g = snap.val();
  if(!g) return;

  gameStarted = g.gameStarted;

  playerCardsDiv.innerHTML = '';

  for(const pid in g.players){
    const div = document.createElement('div');
    div.innerHTML = '<b>' + g.players[pid].nickname + '</b>';

    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'cards';

    const p = g.players[pid];

    for(const c of p.cards){
      const cardEl = document.createElement('div');
      cardEl.className = 'card';

      if(pid !== myId && !p.marked.includes(c)){
        cardEl.classList.add('hidden');
        cardEl.textContent = '';
      }
      else if(p.marked.includes(c)){
        cardEl.classList.add('marked');
        cardEl.textContent = c;
      }
      else{
        cardEl.textContent = c;
      }

      cardsDiv.appendChild(cardEl);
    }

    div.appendChild(cardsDiv);
    playerCardsDiv.appendChild(div);
  }
});