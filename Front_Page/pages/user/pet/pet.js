// pages/user/pet/pet.js
const app = getApp();

Page({
  data: {
    petList: [],
    showPetForm: false,
    editingPet: null,
    petForm: {
      name: '',
      type: 'dog',
      breed: '',
      gender: 'male',
      birthDate: '',
      notes: '',
      avatar: ''
    },
    petTypes: ['狗狗', '猫咪'],
    petTypeIndex: 0,
    breedList: [],
    breedIndex: 0,
    loading: false
  },

  onLoad: function() {
    this.loadPetList();
  },

  onShow: function() {
    this.loadPetList();
  },

  // 加载宠物列表
  loadPetList: function() {
    const token = wx.getStorageSync('token');
    if (!token || token === 'test-token') {
      // 未登录时从本地存储加载
      const petList = wx.getStorageSync('petList') || [];
      this.setData({
        petList: petList
      });
      return;
    }

    this.setData({ loading: true });

    app.request({
      url: '/api/pets',
      method: 'GET',
    }).then((res) => {
      this.setData({ loading: false });
      if (res.statusCode === 200 && res.data.success) {
        const petList = res.data.data || [];
        this.setData({
          petList: petList
        });
        // 同时更新本地存储
        wx.setStorageSync('petList', petList);
      } else {
        console.error('获取宠物列表失败:', res.data);
        wx.showToast({
          title: res.data?.message || '获取宠物列表失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      this.setData({ loading: false });
      console.error('获取宠物列表错误:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 添加宠物
  addPet: function() {
    this.setData({
      showPetForm: true,
      editingPet: null,
      petForm: {
        name: '',
        type: 'dog',
        breed: '',
        gender: 'male',
        birthDate: '',
        notes: '',
        avatar: ''
      },
      petTypeIndex: 0
    });
    this.loadBreedList('dog');
  },

  // 编辑宠物
  editPet: function(e) {
    const petId = e.currentTarget.dataset.id;
    const pet = this.data.petList.find(item => item._id === petId || item.id === petId);
    if (pet) {
      const petTypeIndex = this.data.petTypes.findIndex(type => {
        const typeMap = { 'dog': '狗狗', 'cat': '猫咪' };
        return typeMap[pet.type] === type;
      });
      
      this.setData({
        showPetForm: true,
        editingPet: pet,
        petForm: { 
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          gender: pet.gender,
          birthDate: pet.birthDate ? pet.birthDate.split('T')[0] : '',
          notes: pet.notes || '',
          avatar: pet.avatar ? (pet.avatar.url || pet.avatar) : ''
        },
        petTypeIndex: petTypeIndex >= 0 ? petTypeIndex : 0
      });
      this.loadBreedList(pet.type, pet.breed);
    }
  },

  // 查看健康记录
  viewHealth: function(e) {
    const petId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '直接跳转健康记录页面筛选后该宠物的健康历史',
      icon: 'none'
    });
    // 临时注释掉导航，避免路径冲突
    // wx.navigateTo({
    //   url: `/pages/pet/health/health?petId=${petId}`
    // });
  },

  // 删除宠物
  deletePet: function(e) {
    const petId = e.currentTarget.dataset.id;
    const pet = this.data.petList.find(item => item._id === petId || item.id === petId);
    
    wx.showModal({
      title: '删除宠物',
      content: `确定要删除宠物"${pet.name}"吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          this.performDeletePet(petId);
        }
      }
    });
  },

  // 执行删除宠物
  performDeletePet: function(petId) {
    const token = wx.getStorageSync('token');
    if (!token || token === 'test-token') {
      // 未登录时从本地存储删除
      const newPetList = this.data.petList.filter(item => (item._id !== petId && item.id !== petId));
      wx.setStorageSync('petList', newPetList);
      this.setData({
        petList: newPetList
      });
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      return;
    }

    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    app.request({
      url: `/api/pets/${petId}`,
      method: 'DELETE',
    }).then((res) => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        this.loadPetList(); // 重新加载列表
      } else {
        wx.showToast({
          title: res.data?.message || '删除失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('删除宠物错误:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 关闭宠物表单
  closePetForm: function() {
    this.setData({
      showPetForm: false
    });
  },

  // 加载品种列表
  loadBreedList: function(type, currentBreed) {
    app.request({
      url: `/api/pets/breeds?type=${type}`,
      method: 'GET',
    }).then((res) => {
      if (res.statusCode === 200 && res.data.success) {
        const breedList = res.data.data || [];
        let breedIndex = 0;
        if (currentBreed) {
          breedIndex = breedList.findIndex(breed => breed === currentBreed);
          if (breedIndex === -1) breedIndex = 0;
        }
        this.setData({
          breedList: breedList,
          breedIndex: breedIndex
        });
      } else {
        console.error('获取品种列表失败:', res.data);
        // 使用默认品种列表
        this.setDefaultBreedList(type, currentBreed);
      }
    }).catch((error) => {
      console.error('获取品种列表错误:', error);
      // 使用默认品种列表
      this.setDefaultBreedList(type, currentBreed);
    });
  },

  // 设置默认品种列表
  setDefaultBreedList: function(type, currentBreed) {
    const defaultBreeds = {
      dog: ['中华田园犬', '金毛寻回犬', '拉布拉多', '哈士奇', '萨摩耶', '阿拉斯加', '德国牧羊犬', '边境牧羊犬', '柯基', '柴犬', '泰迪', '比熊', '博美', '吉娃娃', '法斗', '英斗', '腊肠犬', '藏獒', '混种'],
      cat: ['中华田园猫', '英国短毛猫', '美国短毛猫', '波斯猫', '布偶猫', '暹罗猫', '缅因猫', '俄罗斯蓝猫', '苏格兰折耳猫', '金吉拉', '孟加拉猫', '阿比西尼亚猫', '挪威森林猫', '土耳其安哥拉猫', '埃及猫', '混种']
    };
    const breedList = defaultBreeds[type] || [];
    let breedIndex = 0;
    if (currentBreed) {
      breedIndex = breedList.findIndex(breed => breed === currentBreed);
      if (breedIndex === -1) breedIndex = 0;
    }
    this.setData({
      breedList: breedList,
      breedIndex: breedIndex
    });
  },

  // 选择宠物头像
  choosePetAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'petForm.avatar': tempFilePath
        });
      }
    });
  },

  // 输入宠物名称
  onNameInput: function(e) {
    this.setData({
      'petForm.name': e.detail.value
    });
  },

  // 选择宠物类型
  onPetTypeChange: function(e) {
    const typeMap = ['dog', 'cat', 'rabbit', 'hamster', 'other'];
    this.setData({
      petTypeIndex: e.detail.value,
      'petForm.type': typeMap[e.detail.value]
    });
  },

  // 选择品种
  onBreedChange: function(e) {
    const index = e.detail.value;
    const breed = this.data.breedList[index];
    this.setData({
      breedIndex: index,
      'petForm.breed': breed
    });
  },

  // 选择性别
  selectGender: function(e) {
    this.setData({
      'petForm.gender': e.currentTarget.dataset.gender
    });
  },

  // 选择宠物类型
  selectPetType: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'petForm.type': type,
      'petForm.breed': '', // 清空品种选择
      breedIndex: 0
    });
    this.loadBreedList(type);
  },

  // 选择出生日期
  onBirthDateChange: function(e) {
    this.setData({
      'petForm.birthDate': e.detail.value
    });
  },


  // 输入备注
  onNotesInput: function(e) {
    this.setData({
      'petForm.notes': e.detail.value
    });
  },



  // 保存宠物
  savePet: function() {
    const petForm = this.data.petForm;
    
    // 验证必填字段
    if (!petForm.name.trim()) {
      wx.showToast({
        title: '请输入宠物名称',
        icon: 'none'
      });
      return;
    }

    if (!petForm.type) {
      wx.showToast({
        title: '请选择宠物类型',
        icon: 'none'
      });
      return;
    }

    if (!petForm.breed.trim()) {
      wx.showToast({
        title: '请输入品种',
        icon: 'none'
      });
      return;
    }

    if (!petForm.gender) {
      wx.showToast({
        title: '请选择性别',
        icon: 'none'
      });
      return;
    }

    if (!petForm.birthDate) {
      wx.showToast({
        title: '请选择出生日期',
        icon: 'none'
      });
      return;
    }

    this.performSavePet(petForm);
  },

  // 执行保存宠物
  performSavePet: function(petForm) {
    const token = wx.getStorageSync('token');
    if (!token || token === 'test-token') {
      // 未登录时保存到本地存储
      this.savePetToLocal(petForm);
      return;
    }

    wx.showLoading({
      title: this.data.editingPet ? '更新中...' : '保存中...',
      mask: true
    });

    const petData = {
      name: petForm.name.trim(),
      type: petForm.type,
      breed: petForm.breed.trim(),
      gender: petForm.gender,
      birthDate: petForm.birthDate,
      notes: petForm.notes || '',
      avatar: petForm.avatar ? {
        url: petForm.avatar,
        source: 'upload',
        key: '',
      } : undefined
    };

    const url = this.data.editingPet ? `/api/pets/${this.data.editingPet._id || this.data.editingPet.id}` : '/api/pets';
    const method = this.data.editingPet ? 'PUT' : 'POST';

    app.request({
      url: url,
      method: method,
      data: petData,
    }).then((res) => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.success) {
        wx.showToast({
          title: this.data.editingPet ? '更新成功' : '添加成功',
          icon: 'success'
        });
        this.setData({
          showPetForm: false
        });
        this.loadPetList(); // 重新加载列表
      } else {
        wx.showToast({
          title: res.data?.message || (this.data.editingPet ? '更新失败' : '添加失败'),
          icon: 'none'
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('保存宠物错误:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 保存到本地存储（未登录时使用）
  savePetToLocal: function(petForm) {
    // 计算年龄
    let age = '';
    if (petForm.birthDate) {
      const birthDate = new Date(petForm.birthDate);
      const today = new Date();
      const diffTime = Math.abs(today - birthDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      age = Math.floor(diffDays / 365);
    }

    const petData = {
      ...petForm,
      age: age || '未知',
      createTime: new Date().getTime()
    };

    let newPetList = [...this.data.petList];

    if (this.data.editingPet) {
      // 编辑现有宠物
      const index = newPetList.findIndex(item => (item._id === this.data.editingPet._id || item.id === this.data.editingPet.id));
      if (index !== -1) {
        petData.id = this.data.editingPet.id || this.data.editingPet._id;
        petData._id = this.data.editingPet._id || this.data.editingPet.id;
        newPetList[index] = petData;
      }
    } else {
      // 添加新宠物
      const id = Date.now().toString();
      petData.id = id;
      petData._id = id;
      newPetList.push(petData);
    }

    wx.setStorageSync('petList', newPetList);
    this.setData({
      petList: newPetList,
      showPetForm: false
    });

    wx.showToast({
      title: this.data.editingPet ? '更新成功' : '添加成功',
      icon: 'success'
    });
  }
})