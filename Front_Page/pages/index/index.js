// index.js
const app = getApp();

Page({
	data: {
		// 宠物头像列表（从全局或存储读取，若无则使用占位）
		petList: [],
		hasNewPost: false,
		hasNewArticle: true,
		healthTip: '定期为宠物检查皮肤状况，发现异常及时就诊',
		tipsList: [
			'定期为宠物检查皮肤状况，发现异常及时就诊',
			'保持宠物被毛清洁干燥，定期给宠物洗澡和梳理',
			'选择适合宠物皮肤类型的洗护产品，避免刺激',
			'确保宠物有均衡的营养摄入，有助于皮肤健康',
			'注意防治体外寄生虫，定期驱虫很重要'
		],
		// 科普文章（与知识科普页一致的一份基础数据，可替换为接口返回）
		knowledgeArticles: [
			{ id: 'k1', title: '识别常见皮肤病', summary: '如何区分常见宠物皮肤病的症状与表现。' },
			{ id: 'k2', title: '季节性过敏预防', summary: '气候变化可能引发宠物过敏，预防从环境管理做起。' },
			{ id: 'k3', title: '洗护产品选择指南', summary: '根据皮肤类型选择温和无刺激的洗护产品。' },
			{ id: 'k4', title: '寄生虫防治策略', summary: '建立定期驱虫计划，保障皮肤与被毛健康。' }
		],
		dailyKnowledge: { title: '', summary: '' },
		// 消息中心
		showMessagePopup: false,
		messages: [
			{ id: 'm1', title: '社区点赞', time: '今天 10:20', content: '用户 小李 赞了你的帖子《春季宠物皮肤护理心得》' },
			{ id: 'm2', title: '社区评论', time: '今天 09:05', content: '用户 Kitty 评论了你的帖子：讲得很专业，受教了！' },
			{ id: 'm3', title: '复诊提醒', time: '昨天 18:00', content: '明天 09:30 复诊预约，请携带最近的用药记录与照片' },
			{ id: 'm4', title: '用药提醒', time: '昨天 08:00', content: '请按时为 小黑 使用外用药：酮康唑软膏（每日1次）' },
			{ id: 'm5', title: '系统通知', time: '本周一 12:10', content: '为了更好地服务，请完善您的宠物档案信息，补充最近一次体检记录与过敏史。' },
			{ id: 'm6', title: '活动消息', time: '上周五 14:45', content: '社区发起"夏季皮肤护理心得分享"活动，参与即可获得积分与宠物洗护试用装，快来参加吧～' }
		]
	},

	onLoad: function() {
		this.randomTip();
		this.initPetList();
		this.initDailyKnowledge();
		this.checkNewContent();
	},
	
	onShow: function() {
		// 每次页面显示时随机更换健康提示
		this.randomTip();
		// 同步宠物列表（避免其他页面更新未反映）
		this.initPetList();
	},
	
	initPetList() {
		// 从宠物管理页面同步数据
		const petList = wx.getStorageSync('petList') || [];
		const processedPets = petList.map((p, idx) => ({ 
			id: p.id || `p${idx+1}`,
			name: p.name || `宠物${idx+1}`,
			avatar: p.avatar || '/images/default_pet.png'
		}));
		this.setData({ petList: processedPets });
	},
	
	initDailyKnowledge() {
		const today = new Date();
		const keyDate = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
		try {
			const cachedDate = wx.getStorageSync('dailyKnowledgeDate');
			const cachedData = wx.getStorageSync('dailyKnowledge');
			if (cachedDate === keyDate && cachedData) {
				this.setData({ dailyKnowledge: cachedData });
				return;
			}
		} catch (e) {}
		const list = this.data.knowledgeArticles;
		const index = Math.floor(Math.random() * list.length);
		const pick = list[index];
		this.setData({ dailyKnowledge: pick });
		try {
			wx.setStorageSync('dailyKnowledgeDate', keyDate);
			wx.setStorageSync('dailyKnowledge', pick);
		} catch (e) {}
	},
	
	// 随机选择健康提示
	randomTip: function() {
		const index = Math.floor(Math.random() * this.data.tipsList.length);
		this.setData({
			healthTip: this.data.tipsList[index]
		});
	},
	
	// 检查新内容（模拟）
	checkNewContent: function() {
		this.setData({
			hasNewPost: Math.random() > 0.5,
			hasNewArticle: Math.random() > 0.3
		});
	},
	
	onTapPet(e) {
		const id = e.currentTarget.dataset.id;
		// 预留：可跳转到宠物详情或编辑页
	},
	
	openMessages() {
		this.setData({ showMessagePopup: true });
	},
	
	closeMessages() {
		this.setData({ showMessagePopup: false });
	},
	
	// 页面导航
	navigateTo: function(e) {
		const url = e.currentTarget.dataset.url;
		const isTab = e.currentTarget.dataset.tab === true || e.currentTarget.dataset.tab === 'true';
		if (isTab) {
			wx.switchTab({ url });
			return;
		}
		wx.navigateTo({ url });
	}
})
