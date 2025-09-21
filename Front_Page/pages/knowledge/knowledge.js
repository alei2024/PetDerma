Page({
	data: {
		searchQuery: '',
		activeTab: 'science', // 'science' | 'favorite'
		showArticleModal: false, // 是否显示文章详情弹窗
		selectedArticle: null, // 当前选中的文章
		articles: [
			{ 
				id: 'k1', 
				title: '识别常见皮肤病', 
				summary: '如何区分常见宠物皮肤病的症状与表现。',
				author: 'Dr. 李兽医',
				publishTime: '2024-01-15',
				readCount: 1250,
				category: '疾病诊断',
				content: `
				<h3>常见宠物皮肤病识别指南</h3>
				<p>宠物皮肤病是日常生活中最常见的宠物健康问题之一。及早识别症状对于治疗至关重要。</p>
				
				<h4>1. 皮肤癣病</h4>
				<p><strong>症状特征：</strong></p>
				<ul>
					<li>圆形脱毛斑块，边缘清晰</li>
					<li>患处皮肤发红、有鳞屑</li>
					<li>可能伴有轻微瘙痒</li>
				</ul>
				<p><strong>好发部位：</strong>头部、四肢、躯干</p>
				
				<h4>2. 湿疹性皮炎</h4>
				<p><strong>症状特征：</strong></p>
				<ul>
					<li>皮肤红肿、潮湿</li>
					<li>剧烈瘙痒，宠物频繁抓挠</li>
					<li>可能出现水疱、糜烂</li>
				</ul>
				<p><strong>好发部位：</strong>腹部、腋下、四肢内侧</p>
				
				<h4>3. 寄生虫性皮炎</h4>
				<p><strong>症状特征：</strong></p>
				<ul>
					<li>小红点状皮疹</li>
					<li>强烈瘙痒</li>
					<li>可能看到虫体或虫卵</li>
				</ul>
				
				<h4>诊断建议</h4>
				<p>如发现以上症状，建议及时就医。专业兽医会通过以下方式确诊：</p>
				<ul>
					<li>皮肤刮片镜检</li>
					<li>真菌培养</li>
					<li>过敏原检测</li>
				</ul>
				
				<p><em>注意：本文仅供参考，具体诊断和治疗请咨询专业兽医。</em></p>
				`
			},
			{ 
				id: 'k2', 
				title: '季节性过敏预防', 
				summary: '气候变化可能引发宠物过敏，预防从环境管理做起。',
				author: 'Dr. 王医生',
				publishTime: '2024-01-20',
				readCount: 980,
				category: '预防保健',
				content: `
				<h3>宠物季节性过敏预防全攻略</h3>
				<p>随着季节变化，许多宠物会出现过敏反应。了解预防措施能有效减少宠物的不适。</p>
				
				<h4>常见过敏原</h4>
				<ul>
					<li><strong>花粉：</strong>春季树木花粉、夏季草类花粉</li>
					<li><strong>尘螨：</strong>在温暖潮湿环境中大量繁殖</li>
					<li><strong>霉菌：</strong>阴雨季节室内外霉菌增多</li>
					<li><strong>昆虫：</strong>跳蚤、蚊虫叮咬</li>
				</ul>
				
				<h4>过敏症状识别</h4>
				<ul>
					<li>频繁抓挠、舔舐</li>
					<li>皮肤红肿、起疹</li>
					<li>眼部流泪、鼻涕</li>
					<li>呼吸急促、打喷嚏</li>
				</ul>
				
				<h4>预防措施</h4>
				<p><strong>环境管理：</strong></p>
				<ul>
					<li>定期清洁居住环境，减少尘螨</li>
					<li>保持室内适宜湿度（40-60%）</li>
					<li>使用空气净化器过滤过敏原</li>
					<li>避免在花粉高峰期外出</li>
				</ul>
				
				<p><strong>日常护理：</strong></p>
				<ul>
					<li>定期洗澡，清除皮毛上的过敏原</li>
					<li>使用低敏洗护产品</li>
					<li>外出回家后及时清洁爪子</li>
					<li>定期更换宠物用品</li>
				</ul>
				
				<p><strong>饮食调理：</strong></p>
				<ul>
					<li>选择低敏配方粮食</li>
					<li>补充Omega-3脂肪酸</li>
					<li>避免易致敏食物</li>
				</ul>
				`
			},
			{ 
				id: 'k3', 
				title: '洗护产品选择指南', 
				summary: '根据皮肤类型选择温和无刺激的洗护产品。',
				author: 'Dr. 张专家',
				publishTime: '2024-01-25',
				readCount: 1100,
				category: '日常护理',
				content: `
				<h3>宠物洗护产品选择完全指南</h3>
				<p>选择合适的洗护产品对维护宠物皮肤健康至关重要。不同皮肤类型需要不同的护理方案。</p>
				
				<h4>皮肤类型判断</h4>
				<p><strong>正常皮肤：</strong></p>
				<ul>
					<li>皮肤光滑有弹性</li>
					<li>毛发有光泽</li>
					<li>无明显皮屑或异味</li>
				</ul>
				
				<p><strong>干燥皮肤：</strong></p>
				<ul>
					<li>皮肤紧绷、缺乏光泽</li>
					<li>有细小皮屑</li>
					<li>毛发粗糙、易断</li>
				</ul>
				
				<p><strong>敏感皮肤：</strong></p>
				<ul>
					<li>容易发红、瘙痒</li>
					<li>对环境变化敏感</li>
					<li>使用新产品易过敏</li>
				</ul>
				
				<p><strong>油性皮肤：</strong></p>
				<ul>
					<li>皮肤油腻、毛孔粗大</li>
					<li>容易产生异味</li>
					<li>毛发容易打结</li>
				</ul>
				
				<h4>产品选择原则</h4>
				<p><strong>温和性优先：</strong></p>
				<ul>
					<li>选择pH值适中的产品（6.5-7.5）</li>
					<li>避免含硫酸盐的强清洁剂</li>
					<li>优选天然植物成分</li>
				</ul>
				
				<p><strong>功能性选择：</strong></p>
				<ul>
					<li><strong>保湿型：</strong>适合干燥皮肤，含有透明质酸、甘油等</li>
					<li><strong>舒缓型：</strong>适合敏感皮肤，含有洋甘菊、芦荟等</li>
					<li><strong>控油型：</strong>适合油性皮肤，含有茶树油、柠檬酸等</li>
					<li><strong>药用型：</strong>治疗性产品，需遵医嘱使用</li>
				</ul>
				
				<h4>使用注意事项</h4>
				<ul>
					<li>首次使用前进行小范围测试</li>
					<li>水温控制在37-39°C</li>
					<li>彻底冲洗，避免残留</li>
					<li>使用频率：正常皮肤1-2周一次，问题皮肤遵医嘱</li>
				</ul>
				`
			},
			{ 
				id: 'k4', 
				title: '寄生虫防治策略', 
				summary: '建立定期驱虫计划，保障皮肤与被毛健康。',
				author: 'Dr. 刘兽医',
				publishTime: '2024-01-30',
				readCount: 1350,
				category: '预防保健',
				content: `
				<h3>宠物寄生虫防治完全手册</h3>
				<p>寄生虫是影响宠物皮肤健康的重要因素。建立科学的防治策略，能有效保护宠物免受寄生虫困扰。</p>
				
				<h4>常见外寄生虫</h4>
				<p><strong>跳蚤：</strong></p>
				<ul>
					<li>症状：剧烈瘙痒、小红点、黑色颗粒（跳蚤粪便）</li>
					<li>好发季节：温暖潮湿的春夏季</li>
					<li>传播途径：与感染动物接触、环境感染</li>
				</ul>
				
				<p><strong>蜱虫：</strong></p>
				<ul>
					<li>症状：皮肤上可见灰褐色虫体、局部红肿</li>
					<li>好发部位：头颈部、耳朵、四肢</li>
					<li>危害：可传播多种疾病</li>
				</ul>
				
				<p><strong>螨虫：</strong></p>
				<ul>
					<li>疥螨：剧烈瘙痒、脱毛、皮肤增厚</li>
					<li>蠕形螨：局部脱毛、皮肤发红</li>
					<li>耳螨：耳部瘙痒、黑褐色分泌物</li>
				</ul>
				
				<h4>常见内寄生虫</h4>
				<p><strong>肠道寄生虫：</strong></p>
				<ul>
					<li>蛔虫：腹部膨大、营养不良</li>
					<li>钩虫：贫血、黑便</li>
					<li>绦虫：肛门周围可见白色节片</li>
				</ul>
				
				<h4>防治策略</h4>
				<p><strong>定期驱虫：</strong></p>
				<ul>
					<li>幼宠：2-4周龄开始，每2-4周一次</li>
					<li>成年宠物：每3-6个月一次</li>
					<li>怀孕宠物：遵医嘱特殊安排</li>
				</ul>
				
				<p><strong>环境管理：</strong></p>
				<ul>
					<li>定期清洁宠物生活区域</li>
					<li>清洗宠物用品（垫子、玩具等）</li>
					<li>避免在寄生虫高发区域活动</li>
					<li>保持室内适宜湿度</li>
				</ul>
				
				<p><strong>日常检查：</strong></p>
				<ul>
					<li>每日梳理时检查皮毛</li>
					<li>观察宠物行为变化</li>
					<li>定期检查耳朵、爪缝</li>
					<li>注意排便情况</li>
				</ul>
				
				<h4>治疗方法</h4>
				<p><strong>外用药物：</strong></p>
				<ul>
					<li>滴剂：方便使用，效果持久</li>
					<li>喷剂：快速杀虫，适合局部治疗</li>
					<li>洗剂：清洁同时驱虫</li>
				</ul>
				
				<p><strong>口服药物：</strong></p>
				<ul>
					<li>片剂：广谱驱虫，内外兼治</li>
					<li>颗粒：易于喂食，适合幼宠</li>
				</ul>
				
				<p><em>注意：药物选择和用法用量请咨询专业兽医，切勿自行用药。</em></p>
				`
			}
		],
		displayArticles: [],
		favoriteArticles: []
	},

	onLoad() {
		this.setData({ displayArticles: this.data.articles });
		// 模拟收藏一条
		this.setData({ favoriteArticles: [ this.data.articles[1] ] });
	},

	onSearchInput(e) {
		this.setData({ searchQuery: e.detail.value || '' });
	},

	doSearch() {
		const q = (this.data.searchQuery || '').trim();
		if (!q) {
			this.setData({ displayArticles: this.data.articles });
			return;
		}
		const lower = q.toLowerCase();
		const filtered = this.data.articles.filter(a =>
			(a.title && a.title.toLowerCase().includes(lower)) ||
			(a.summary && a.summary.toLowerCase().includes(lower))
		);
		this.setData({ displayArticles: filtered });
	},

	switchTab(e) {
		const tab = e.currentTarget.dataset.tab;
		this.setData({ activeTab: tab });
	},

	// 显示文章详情弹窗
	showArticleDetail(e) {
		const articleId = e.currentTarget.dataset.id;
		const article = this.data.articles.find(item => item.id === articleId);
		if (article) {
			// 增加阅读数
			article.readCount = (article.readCount || 0) + 1;
			
			this.setData({
				selectedArticle: article,
				showArticleModal: true
			});
		}
	},

	// 隐藏文章详情弹窗
	hideArticleDetail() {
		this.setData({
			showArticleModal: false,
			selectedArticle: null
		});
	},

	// 收藏/取消收藏文章
	toggleFavorite() {
		if (!this.data.selectedArticle) return;
		
		const articleId = this.data.selectedArticle.id;
		let favoriteArticles = [...this.data.favoriteArticles];
		const existIndex = favoriteArticles.findIndex(item => item.id === articleId);
		
		if (existIndex >= 0) {
			// 已收藏，取消收藏
			favoriteArticles.splice(existIndex, 1);
			wx.showToast({
				title: '已取消收藏',
				icon: 'none'
			});
		} else {
			// 未收藏，添加收藏
			favoriteArticles.push(this.data.selectedArticle);
			wx.showToast({
				title: '收藏成功',
				icon: 'success'
			});
		}
		
		this.setData({
			favoriteArticles: favoriteArticles
		});
	},

	// 检查文章是否已收藏
	isFavorited() {
		if (!this.data.selectedArticle) return false;
		return this.data.favoriteArticles.some(item => item.id === this.data.selectedArticle.id);
	},

	// 分享文章
	shareArticle() {
		if (!this.data.selectedArticle) return;
		
		wx.showShareMenu({
			withShareTicket: true,
			menus: ['shareAppMessage', 'shareTimeline']
		});
		
		wx.showToast({
			title: '准备分享',
			icon: 'none'
		});
	}
}) 