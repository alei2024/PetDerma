// pages/user/pet/pet.js
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
      weight: '',
      notes: '',
      medicalHistory: '',
      sterilized: 'no',
      avatar: ''
    },
    petTypes: ['狗狗', '猫咪', '兔子', '仓鼠', '其他'],
    petTypeIndex: 0
  },

  onLoad: function() {
    this.loadPetList();
  },

  onShow: function() {
    this.loadPetList();
  },

  // 加载宠物列表
  loadPetList: function() {
    const petList = wx.getStorageSync('petList') || [];
    this.setData({
      petList: petList
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
        weight: '',
        notes: '',
        avatar: ''
      },
      petTypeIndex: 0
    });
  },

  // 编辑宠物
  editPet: function(e) {
    const petId = e.currentTarget.dataset.id;
    const pet = this.data.petList.find(item => item.id === petId);
    if (pet) {
      const petTypeIndex = this.data.petTypes.findIndex(type => {
        const typeMap = { 'dog': '狗狗', 'cat': '猫咪', 'rabbit': '兔子', 'hamster': '仓鼠', 'other': '其他' };
        return typeMap[pet.type] === type;
      });
      
      this.setData({
        showPetForm: true,
        editingPet: pet,
        petForm: { ...pet },
        petTypeIndex: petTypeIndex >= 0 ? petTypeIndex : 0
      });
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
    const pet = this.data.petList.find(item => item.id === petId);
    
    wx.showModal({
      title: '删除宠物',
      content: `确定要删除宠物"${pet.name}"吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          const newPetList = this.data.petList.filter(item => item.id !== petId);
          wx.setStorageSync('petList', newPetList);
          this.setData({
            petList: newPetList
          });
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 关闭宠物表单
  closePetForm: function() {
    this.setData({
      showPetForm: false
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

  // 输入品种
  onBreedInput: function(e) {
    this.setData({
      'petForm.breed': e.detail.value
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
    this.setData({
      'petForm.type': e.currentTarget.dataset.type
    });
  },

  // 选择出生日期
  onBirthDateChange: function(e) {
    this.setData({
      'petForm.birthDate': e.detail.value
    });
  },

  // 输入体重
  onWeightInput: function(e) {
    this.setData({
      'petForm.weight': e.detail.value
    });
  },

  // 输入备注
  onNotesInput: function(e) {
    this.setData({
      'petForm.notes': e.detail.value
    });
  },

  // 选择绝育状态
  selectSterilized: function(e) {
    this.setData({
      'petForm.sterilized': e.currentTarget.dataset.sterilized
    });
  },

  // 输入既往病史
  onMedicalHistoryInput: function(e) {
    this.setData({
      'petForm.medicalHistory': e.detail.value
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

    if (!petForm.gender) {
      wx.showToast({
        title: '请选择性别',
        icon: 'none'
      });
      return;
    }

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
      const index = newPetList.findIndex(item => item.id === this.data.editingPet.id);
      if (index !== -1) {
        petData.id = this.data.editingPet.id;
        newPetList[index] = petData;
      }
    } else {
      // 添加新宠物
      petData.id = Date.now().toString();
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