# PetDerma 瀹犵墿鐨偆鐥呰瘖鏂笌绀惧尯浜ゆ祦骞冲彴

## 馃搵 椤圭洰姒傝堪

PetDerma 鏄竴涓泦鎴愪簡瀹犵墿鐨偆鐥?AI 璇婃柇鍜岀ぞ鍖轰氦娴佸姛鑳界殑寰俊灏忕▼搴忓钩鍙帮紝鍖呭惈锛?

- 馃敩 **AI 璇婃柇鍔熻兘**: 鍩轰簬娣卞害瀛︿範鐨勫疇鐗╃毊鑲ょ梾鏅鸿兘璇婃柇
- 馃挰 **绀惧尯浜ゆ祦**: 鐢ㄦ埛鍙彂甯栥€佽瘎璁恒€佺偣璧炪€佹敹钘忥紝鍒嗕韩瀹犵墿鎶ょ悊缁忛獙
- 馃敂 **瀹炴椂閫氱煡**: WebSocket 瀹炴椂娑堟伅鎺ㄩ€佺郴缁?
- 馃懁 **鐢ㄦ埛绯荤粺**: 瀹屾暣鐨勭敤鎴锋敞鍐屻€佺櫥褰曘€佷釜浜鸿祫鏂欑鐞?
- 馃摎 **鐭ヨ瘑绉戞櫘**: 瀹犵墿鍋ュ悍鐭ヨ瘑搴撳拰姣忔棩绉戞櫘

> 榛樿鐢ㄦ埛鍗曡瘉鍜屾湇鍔＄被鍨嬬殑 API 鍦板潃宸插搴旂粠锛屼粠寮€鍙戞鏌ョ殑灏忕▼搴忛》鑱斾細鐩存帴璁块棶 Render 绯荤粺鍦板潃 `https://petderma.onrender.com` 锛岀綉缁滃悎璁″敮鎸佽祫婧愩€佺綉璺拰 WebSocket (`wss://petderma.onrender.com`) 鍒锋柊瀹炴椂閫氱煡銆?

## 馃彈锔?椤圭洰鏋舵瀯

```
PetDerma/
鈹溾攢鈹€ Community_backend/          # Node.js 鍚庣鏈嶅姟
鈹?  鈹溾攢鈹€ config/                # 鏁版嵁搴撻厤缃?
鈹?  鈹溾攢鈹€ controllers/           # 涓氬姟閫昏緫鎺у埗鍣?
鈹?  鈹溾攢鈹€ models/               # MongoDB 鏁版嵁妯″瀷
鈹?  鈹溾攢鈹€ routes/               # API 璺敱
鈹?  鈹溾攢鈹€ services/             # WebSocket 鏈嶅姟
鈹?  鈹溾攢鈹€ middleware/           # 涓棿浠?
鈹?  鈹溾攢鈹€ utils/                # 宸ュ叿鍑芥暟
鈹?  鈹斺攢鈹€ scripts/              # 鏁版嵁搴撹剼鏈?
鈹溾攢鈹€ Front_Page/                # 寰俊灏忕▼搴忓墠绔?
鈹?  鈹溾攢鈹€ pages/                # 灏忕▼搴忛〉闈?
鈹?  鈹溾攢鈹€ components/           # 鑷畾涔夌粍浠?
鈹?  鈹溾攢鈹€ config/               # 鍓嶇閰嶇疆
鈹?  鈹溾攢鈹€ utils/                # 宸ュ叿鍑芥暟
鈹?  鈹斺攢鈹€ images/               # 闈欐€佽祫婧?
鈹斺攢鈹€ 閰嶇疆璇存槑.md               # 鏈枃妗?
```

## 馃殌 蹇€熷紑濮?

### 鐜瑕佹眰

- **Node.js**: >= 14.0.0
- **MongoDB**: >= 4.0
- **寰俊寮€鍙戣€呭伐鍏?*: 鏈€鏂扮増鏈?
- **鎿嶄綔绯荤粺**: Windows/macOS/Linux

### 1. 鍏嬮殕椤圭洰

```bash
git clone <repository-url>
cd PetDerma
```

### 2. 鍚庣閰嶇疆涓庡惎鍔ㄣ€愨潡蹇呭仛銆?

> ⚠️ 榛樿鎵€鏈夋湇鍔″叧鑱旂粍浠舵槸閫氳繃 `https://petderma.onrender.com` 鏈嶅姟鍣ㄥ嚭鐜帮紝濡傛灉浣犲彲瀹氱悊鍦板潃鍦ㄧ敓浜х幆澧冮€傚悎娉ㄥ惎鍔ㄥ悗鍙拌祫婧愩€備笉闇€瑕佸湪鏈湴鍚姩 MongoDB 鎴栧悗鍙帮紝鍙互鐩存帴璁块棶灏忕▼搴忓钩鍙般€傚闇€瑕佹湁鏈湴鏂版彃鍔犻噸閰嶇疆锛屽彲淇敼 `Front_Page/config/environment.js` 鎴栬€呭綋鍓嶇敓浜т俊鎭皟鏁村悗鍚姩鍚庣銆?

#### **锛?锛?鍚姩 MongoDB 鏁版嵁搴撴湇鍔?*

鏍规嵁浣犵殑绯荤粺鍜岄渶姹傞€夋嫨涓€绉嶆柟寮忓惎鍔細

**鏂瑰紡 1锛氱郴缁熸湇鍔″惎鍔紙閫傚悎闀挎湡杩愯锛屾帹鑽愮敓浜х幆澧冿級**

```bash
# Windows锛堜互绠＄悊鍛樿韩浠借繍琛岀粓绔級
net start MongoDB  # 鑻ュ凡瀹夎涓虹郴缁熸湇鍔?

# macOS锛圚omebrew 瀹夎锛?
brew services start mongodb-community

# Linux锛坰ystemd 绠＄悊锛?
sudo systemctl start mongod
```

**鏂瑰紡 2锛氬懡浠よ鐩存帴鍚姩锛堥€傚悎涓存椂娴嬭瘯锛?*

```bash
# 鏈€绠€鍗曞惎鍔紙浣跨敤榛樿閰嶇疆锛屾暟鎹矾寰勯粯璁ゅ湪 /data/db 鎴?MongoDB 瀹夎鐩綍锛?
mongod

# 鎺ㄨ崘锛氭寚瀹氳嚜瀹氫箟鏁版嵁瀛樺偍璺緞锛堥渶鍏堢‘淇濈洰褰曞瓨鍦級
# Linux/macOS
mongod --dbpath /path/to/your/database

# Windows
mongod --dbpath D:\path\to\your\database
```

#### **锛?锛?瀹夎鍚庣渚濊禆锛堥娆¤繍琛屾椂鎵ц锛?*

```bash
cd Community_backend  # 杩涘叆鍚庣椤圭洰鐩綍
npm install  # 瀹夎渚濊禆鍖?
```

#### **锛?锛?鍒濆鍖栨暟鎹簱锛堟寜闇€鎵ц锛?*

```bash
# 妫€鏌ユ暟鎹簱杩炴帴鏄惁姝ｅ父锛堝彲閫夛紝楠岃瘉鏁版嵁搴撴槸鍚﹀惎鍔ㄦ垚鍔燂級
npm run check-db

# 鑻ラ渶瑕佸垵濮嬪寲鏁版嵁搴撶粨鏋勶紙濡傚垱寤洪粯璁よ〃銆佹彃鍏ュ垵濮嬫暟鎹級
npm run init-db
```

#### 锛?锛?鍚姩鍚庣鏈嶅姟

```bash
# 寮€鍙戞ā寮忥紙鎺ㄨ崘锛屾敮鎸佺儹鏇存柊锛?
npm run dev

# 鎴栫敓浜фā寮?
npm start
```

#### 锛?锛夐獙璇佸惎鍔ㄦ垚鍔?

浣跨敤鏈湴鍚庣鏃跺彲閫氳繃杈撳叆杈撳嚭鐪嬪埌浠ヤ笅淇℃伅锛岃〃绀哄悗鍙伴€氶亾鍙婂簲鐢ㄥ湴鍧€鍋滄瀹屾垚锛?

```plaintext
馃殌 鏈嶅姟鍣ㄨ繍琛屽湪绔彛 3000
MongoDB Connected: localhost
```

### 3. 妯″瀷璇婃柇銆愨潡蹇呭仛銆?

**鍚姩Flask鏈嶅姟鍣?*

```bash
cd Front_Page/pages/diagnosis/model
python server_example.py

### 4. 绯荤粺 API 鍦板潃閰嶇疆鎴栧湪绾跨缉鍔?

- **榛樿閰嶇疆**: 灏忕▼搴忛》鑱斾細璁块棶 Render 绯荤粺 `https://petderma.onrender.com` (HTTP) 鍜?`wss://petderma.onrender.com` (WebSocket)銆?`app.js` 鍙婂悗鍙伴厤缃帴鍙ｆ槸鍚﹁嚜鍔ㄩ渶姹傜浉鍏虫帴鍙ｏ紝鏃犳硶缇庢劅鍦ㄧ嚎鏈嶅姟鏃跺彲鐩存帴浣跨敤銆?
- **鏈湴鎺ユ敹**: 浣跨敤鑷繁鍚庣鍜?MongoDB 鏃讹紝杩愯 `Community_backend` 骞朵細璁块棶 `http://localhost:3000` 鎺ュ彛銆?鍙互鍦ㄨ皟璇曞姛鑳借繘琛屽崌绾х互鍙婂皝瑁呴獙璐э紝閰嶇疆鏂瑰紡瑕佷粠 `Front_Page/config/environment.example.js` 澶嶅埗涓?`environment.js` 骞朵笖浣跨敤鍚勮鍦板潃銆?
- **鍦ㄧ嚎鍒囨崲鎿嶄綔**: 鍙寔 `Front_Page/app.js` 锛堝悗鍙伴厤缃帴鎵ц鍏ㄥ眬鎺ㄨ崘锛夋垨鍦ㄤ簰鍔ㄥ欢閲岀墿璇锋祴鍚庤嚜鍔ㄦ洿鎺ュ埌鍦ㄧ嚎銆佹湁闇€鍙墜鍒囨崲鍒?localhost銆傝嚜瀹氬悎鏂规硶鍙互閫氳繃灏忕▼搴忔彃浠惰鐞嗘ā寮忓垏鎹㈢晫闈㈣缃箣鐩存敹鎵句唬鐮併€?
```

### 4. 鍓嶇閰嶇疆銆愨潡蹇呭仛銆?

#### 4.1 鑾峰彇鏈満 IP 鍦板潃

**Windows:**

```cmd
ipconfig
```

鏌ユ壘 "鏃犵嚎灞€鍩熺綉閫傞厤鍣?WLAN" 鎴?"浠ュお缃戦€傞厤鍣? 鐨?IPv4 鍦板潃

**macOS/Linux:**

```bash
ifconfig | grep inet
```

渚嬪锛歚https://petderma.onrender.com`

> 濡傛灉浣跨敤榛樿鐨勮繛鎺ョ綉锛坰ttps://petderma.onrender.com 锛夎緝鍙互鐩存帴璁块棶銆?4.1-4.3 鎿嶄綔鍙互璺宠繃銆傛鑰屽彲淇敼涓撶敤缃戝悕鎴栬€呮€庝箞鍦板潃锛?

#### 4.2 閰嶇疆鍓嶇鏂囦欢

**姝ラ 1: 澶嶅埗閰嶇疆鏂囦欢**

```bash
cd Front_Page

# 澶嶅埗 app 閰嶇疆鏂囦欢
cp app.example.js app.js

# 澶嶅埗鐜閰嶇疆鏂囦欢
cp config/environment.example.js config/environment.js
```

**姝ラ 2: 淇敼 `Front_Page/app.js`**

鎵惧埌绗?12-13 琛岋紝鏇挎崲 `YOUR_IP_ADDRESS` 涓烘偍鐨勫疄闄?IP 鍦板潃锛?

```javascript
// 鉁?涓汉閰嶇疆閮ㄥ垎 - 榛樿浣跨敤绾夸笂鏈嶅姟鍣?
baseURL: "https://petderma.onrender.com",
baseUrl: "https://petderma.onrender.com",
```

**姝ラ 3: 淇敼 `Front_Page/config/environment.js`**

鎵惧埌绗?6-7 琛屽拰绗?11-12 琛岋紝鏇挎崲 IP 鍦板潃锛?

```javascript
development: {
  baseUrl: "https://petderma.onrender.com", // 濡傛灉闇€瑕佷慨鏀逛负鑷繁鏈嶅姟鍣ㄧ綉鍚嶇幆?
  wsUrl: "wss://petderma.onrender.com",
  debug: true,
},
production: {
  baseUrl: "https://petderma.onrender.com", // 瀹炵幇IP鎴栨綉鍚嶅彲鍦↗IY浜嬪疄闄呴厤缃?
  wsUrl: "wss://petderma.onrender.com",
  debug: false,
},
```

#### 4.3 寰俊寮€鍙戣€呭伐鍏烽厤缃?

1. **鎵撳紑寰俊寮€鍙戣€呭伐鍏?*
2. **瀵煎叆椤圭洰**锛?
   - 閫夋嫨 `Front_Page` 鏂囦欢澶?
   - AppID: 浣跨敤娴嬭瘯鍙锋垨鎮ㄧ殑灏忕▼搴?AppID
3. **椤圭洰璁剧疆**锛?
   - 鉂?*鍕鹃€?"涓嶆牎楠屽悎娉曞煙鍚嶃€亀eb-view锛堜笟鍔″煙鍚嶏級銆乀LS 鐗堟湰浠ュ強 HTTPS 璇佷功"**
   - 鍕鹃€?"鍚敤璋冭瘯"

### 5. 楠岃瘉閰嶇疆

#### 4.1 鍚庣楠岃瘉

璁块棶 `http://鎮ㄧ殑IP:3000/api/posts` 搴旇杩斿洖 JSON 鏁版嵁

#### 4.2 鍓嶇楠岃瘉

鍦ㄥ井淇″紑鍙戣€呭伐鍏蜂腑锛?

1. 杩涘叆"绀惧尯"椤甸潰
2. 妫€鏌ユ帶鍒跺彴鏄惁鏈夌綉缁滈敊璇?
3. 灏濊瘯鍙戝竷甯栧瓙娴嬭瘯鍔熻兘

## 馃敡 璇︾粏閰嶇疆璇存槑

### 鏁版嵁搴撻厤缃?

椤圭洰浣跨敤 MongoDB 鏁版嵁搴擄紝閰嶇疆鏂囦欢锛歚Community_backend/config/database.js`

**榛樿閰嶇疆锛?*

```javascript
mongodb://localhost:27017/PetDerma_Community
```

**鑷畾涔夐厤缃細**
濡傞渶淇敼鏁版嵁搴撹繛鎺ワ紝鍙缃幆澧冨彉閲忥細

```bash
export MONGODB_URI="mongodb://your-host:27017/your-database"
```

### 绔彛閰嶇疆

**鍚庣绔彛锛?* 榛樿 3000锛屽彲閫氳繃鐜鍙橀噺淇敼锛?

```bash
export PORT=8080
```

### WebSocket 閰嶇疆

椤圭洰鏀寔涓ょ WebSocket 瀹炵幇锛?

- **Socket.IO**: 鐢ㄤ簬澶嶆潅瀹炴椂鍔熻兘
- **鍘熺敓 WebSocket**: 鐢ㄤ簬寰俊灏忕▼搴忓吋瀹?

閰嶇疆鍦?`Community_backend/services/` 鐩綍涓嬨€?

### 鏂囦欢涓婁紶閰嶇疆

**涓婁紶闄愬埗锛?*

- 鏂囦欢澶у皬锛?MB
- 鏀寔鏍煎紡锛欽PG, PNG, JPEG
- 瀛樺偍鏂瑰紡锛歁ongoDB GridFS

閰嶇疆鏂囦欢锛歚Community_backend/middleware/upload.js`

## 馃幆 鍔熻兘妯″潡璇存槑

### 1. 鐢ㄦ埛绯荤粺

- **娉ㄥ唽/鐧诲綍**: 鏀寔鎵嬫満鍙峰拰寰俊鐧诲綍
- **涓汉璧勬枡**: 澶村儚銆佹樀绉般€佸疇鐗╀俊鎭鐞?
- **鏉冮檺鎺у埗**: JWT token 璁よ瘉

### 2. 绀惧尯鍔熻兘

- **鍙戝笘**: 鏀寔鏂囧瓧銆佸浘鐗囥€佹爣绛?
- **浜掑姩**: 鐐硅禐銆佹敹钘忋€佽瘎璁恒€佸垎浜?
- **涓汉涓績**: 鎴戠殑鍙戝竷銆佹敹钘忋€佽瘎璁?

### 3. 瀹炴椂閫氱煡

- **WebSocket 杩炴帴**: 鑷姩閲嶈繛鏈哄埗
- **閫氱煡绫诲瀷**: 鐐硅禐銆佽瘎璁恒€佹敹钘忛€氱煡
- **娑堟伅涓績**: 閫氱煡鍒楄〃銆佸凡璇荤姸鎬?

### 4. AI 璇婃柇 (鍙€?

- **鍥惧儚璇嗗埆**: 瀹犵墿鐨偆鐥呰瘖鏂?
- **缁撴灉灞曠ず**: 璇婃柇鎶ュ憡鍜屽缓璁?
- **鍘嗗彶璁板綍**: 璇婃柇鍘嗗彶鏌ョ湅

## 馃洜锔?寮€鍙戝伐鍏峰拰鑴氭湰

### 鍚庣鑴氭湰

```bash
# 妫€鏌ユ暟鎹簱杩炴帴鍜屾暟鎹?
npm run check-db

# 娓呯悊娴嬭瘯鏁版嵁锛屼繚鐣?涓敤鎴?
npm run cleanup-users

# 杩佺Щ鏃у笘瀛愭暟鎹?
npm run migrate-posts
```

### 璋冭瘯宸ュ叿

**缃戠粶璋冭瘯锛?* `Front_Page/utils/network-debug.js`

- 缃戠粶鐘舵€佹娴?
- 璇锋眰鏃ュ織璁板綍
- 閿欒璇婃柇

**WebSocket 鐩戞帶锛?* `Front_Page/utils/websocket-monitor.js`

- 杩炴帴鐘舵€佺洃鎺?
- 娑堟伅鏀跺彂鏃ュ織

## 馃毃 甯歌闂

### 1. 缃戠粶杩炴帴闂

**闂**: 鍓嶇鏃犳硶杩炴帴鍚庣
**瑙ｅ喅**:

1. 纭鍚庣鏈嶅姟姝ｅ湪杩愯
2. 妫€鏌?IP 鍦板潃閰嶇疆鏄惁姝ｇ‘
3. 纭闃茬伀澧欒缃?
4. 妫€鏌ュ井淇″紑鍙戣€呭伐鍏风綉缁滆缃?

### 2. 鏁版嵁搴撹繛鎺ュけ璐?

**闂**: MongoDB 杩炴帴閿欒
**瑙ｅ喅**:

1. 纭 MongoDB 鏈嶅姟鍚姩
2. 妫€鏌ユ暟鎹簱 URI 閰嶇疆
3. 楠岃瘉鏁版嵁搴撴潈闄?

### 3. 鍥剧墖涓婁紶澶辫触

**闂**: 鍥剧墖鏃犳硶涓婁紶鎴栨樉绀?
**瑙ｅ喅**:

1. 妫€鏌ユ枃浠跺ぇ灏忛檺鍒?
2. 纭鏂囦欢鏍煎紡鏀寔
3. 楠岃瘉涓婁紶鏉冮檺

### 4. WebSocket 杩炴帴闂

**闂**: 瀹炴椂閫氱煡涓嶅伐浣?
**瑙ｅ喅**:

1. 妫€鏌?WebSocket URL 閰嶇疆
2. 纭鐢ㄦ埛宸茬櫥褰?
3. 鏌ョ湅娴忚鍣ㄦ帶鍒跺彴閿欒

## 馃摫 寰俊灏忕▼搴忕壒娈婇厤缃?

### 1. 鍩熷悕閰嶇疆

鍦ㄥ井淇″叕浼楀钩鍙伴厤缃湇鍔″櫒鍩熷悕锛屼繚鎸佽姹傚拰 WebSocket 鍚堟硶銆?

- **request 鍚堟硶鍩熷悕**: `https://petderma.onrender.com`
- **socket 鍚堟硶鍩熷悕**: `wss://petderma.onrender.com`
- 寮€鍙戞椂鍙互鍦ㄥ伐鍛樺伐鍏峰睍绀轰腑鍔犺浇 “涓嶆牴鏈悎娉ㄧ綉鍞俊鎭拰璇佷功” 浠ヤ究蹇鍔犱細璇濇杈戙紝鎹曡幏寤鸿鍦ㄦ湡浜庢湇鍔″櫒鍩熷悕涓婄瀹氭椂鏇存柊銆?

### 2. 鏉冮檺閰嶇疆

椤圭洰闇€瑕佺殑灏忕▼搴忔潈闄愶細

- **缃戠粶璁块棶**: 璁块棶鍚庣 API
- **浣嶇疆淇℃伅**: 鏌ユ壘闄勮繎瀹犵墿鍖婚櫌 (鍙€?
- **鐩稿唽璁块棶**: 涓婁紶瀹犵墿鐓х墖

### 3. 鐗堟湰鍏煎

- **鍩虹搴撶増鏈?*: >= 2.10.0
- **娓叉煋寮曟搸**: Skyline (鎺ㄨ崘) 鎴?WebView

## 馃敀 瀹夊叏閰嶇疆

### 1. JWT 瀵嗛挜

鍚庣浣跨敤 JWT 杩涜韬唤楠岃瘉锛岄粯璁ゅ瘑閽ュ湪浠ｇ爜涓€傜敓浜х幆澧冭璁剧疆鐜鍙橀噺锛?

```bash
export JWT_SECRET="your-super-secret-key"
```

### 2. CORS 閰嶇疆

鍚庣宸查厤缃?CORS 鍏佽璺ㄥ煙璁块棶锛岀敓浜х幆澧冭闄愬埗鍩熷悕锛?

```javascript
// Community_backend/app.js
app.use(
  cors({
    origin: ["https://petderma.onrender.com"],
  })
);
```

### 3. 閫熺巼闄愬埗

宸查厤缃?API 璁块棶棰戠巼闄愬埗锛?

- **閫氱敤鎺ュ彛**: 100 娆?15 鍒嗛挓
- **涓婁紶鎺ュ彛**: 10 娆?15 鍒嗛挓

## 馃搳 鎬ц兘浼樺寲

### 1. 鏁版嵁搴撶储寮?

椤圭洰宸查厤缃繀瑕佺殑鏁版嵁搴撶储寮曪紝鎻愬崌鏌ヨ鎬ц兘銆?

### 2. 鍥剧墖浼樺寲

- **鍘嬬缉**: 鑷姩鍘嬬缉涓婁紶鍥剧墖
- **缂撳瓨**: 鍥剧墖 URL 缂撳瓨鏈哄埗
- **鎳掑姞杞?*: 鍒楄〃椤甸潰鍥剧墖鎳掑姞杞?

### 3. 缃戠粶浼樺寲

- **璇锋眰閲嶈瘯**: 鑷姩閲嶈瘯鏈哄埗
- **杩炴帴姹?*: 鏁版嵁搴撹繛鎺ュ鐢?
- **WebSocket**: 闀胯繛鎺ュ噺灏戞彙鎵嬪紑閿€

## 馃摑 閮ㄧ讲璇存槑

### 寮€鍙戠幆澧?

- 鏈湴 MongoDB
- Node.js 寮€鍙戞湇鍔″櫒
- 寰俊寮€鍙戣€呭伐鍏?

### 鐢熶骇鐜

- 浜戞暟鎹簱 (MongoDB Atlas 绛?
- 浜戞湇鍔″櫒 (闃块噷浜戙€佽吘璁簯绛?
- HTTPS 璇佷功閰嶇疆
- 鍩熷悕澶囨





