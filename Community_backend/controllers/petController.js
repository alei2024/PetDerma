const Pet = require("../models/Pet");
const User = require("../models/User");

// 获取用户的宠物列表
const getPets = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const pets = await Pet.findByUserId(userId);
    
    res.json({
      success: true,
      data: pets,
    });
  } catch (error) {
    console.error("获取宠物列表错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取单个宠物信息
const getPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;
    
    const pet = await Pet.findByUserAndId(userId, petId);
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在",
      });
    }
    
    res.json({
      success: true,
      data: pet,
    });
  } catch (error) {
    console.error("获取宠物信息错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 创建宠物
const createPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      type,
      breed,
      gender,
      birthDate,
      notes,
      avatar,
    } = req.body;

    // 验证必填字段
    if (!name || !type || !breed || !gender || !birthDate) {
      return res.status(400).json({
        success: false,
        message: "昵称、类型、品种、性别和出生日期都是必填的",
      });
    }

    // 验证类型
    if (!["cat", "dog"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "类型只能是猫或狗",
      });
    }

    // 验证性别
    if (!["male", "female"].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "性别只能是公或母",
      });
    }

    // 验证出生日期
    const birth = new Date(birthDate);
    const today = new Date();
    if (birth > today) {
      return res.status(400).json({
        success: false,
        message: "出生日期不能是未来日期",
      });
    }

    // 检查用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 创建宠物
    const pet = new Pet({
      userId,
      name,
      type,
      breed,
      gender,
      birthDate: birth,
      notes: notes || "",
      avatar: avatar || {
        url: "/images/default_pet.png",
        source: "default",
        key: "",
      },
    });

    await pet.save();

    res.json({
      success: true,
      message: "宠物创建成功",
      data: pet,
    });
  } catch (error) {
    console.error("创建宠物错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 更新宠物信息
const updatePet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;
    const updateData = req.body;

    // 查找宠物
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在",
      });
    }

    // 验证类型
    if (updateData.type && !["cat", "dog"].includes(updateData.type)) {
      return res.status(400).json({
        success: false,
        message: "类型只能是猫或狗",
      });
    }

    // 验证性别
    if (updateData.gender && !["male", "female"].includes(updateData.gender)) {
      return res.status(400).json({
        success: false,
        message: "性别只能是公或母",
      });
    }

    // 验证出生日期
    if (updateData.birthDate) {
      const birth = new Date(updateData.birthDate);
      const today = new Date();
      if (birth > today) {
        return res.status(400).json({
          success: false,
          message: "出生日期不能是未来日期",
        });
      }
      updateData.birthDate = birth;
    }

    // 更新宠物信息
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "宠物信息更新成功",
      data: updatedPet,
    });
  } catch (error) {
    console.error("更新宠物信息错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 删除宠物
const deletePet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;

    // 查找宠物
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在",
      });
    }

    // 软删除（标记为已删除）
    await Pet.findByIdAndUpdate(petId, {
      status: "deleted",
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "宠物删除成功",
    });
  } catch (error) {
    console.error("删除宠物错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 更新宠物头像
const updatePetAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: "头像数据不能为空",
      });
    }

    // 查找宠物
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在",
      });
    }

    // 更新头像
    const cleanAvatar = {
      url: avatar.url,
      source: avatar.source || "upload",
      key: avatar.key || (avatar.imageId ? avatar.imageId.toString() : ""),
      imageId: avatar.imageId || null,
    };

    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { avatar: cleanAvatar, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "头像更新成功",
      data: {
        avatar: updatedPet.avatar,
      },
    });
  } catch (error) {
    console.error("更新宠物头像错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取宠物品种列表
const getBreeds = async (req, res) => {
  try {
    const { type } = req.query;

    if (!type || !["cat", "dog"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "请指定宠物类型（cat或dog）",
      });
    }

    const breeds = {
      cat: [
        "中华田园猫",
        "英国短毛猫",
        "美国短毛猫",
        "波斯猫",
        "布偶猫",
        "暹罗猫",
        "缅因猫",
        "俄罗斯蓝猫",
        "苏格兰折耳猫",
        "金吉拉",
        "孟加拉猫",
        "阿比西尼亚猫",
        "挪威森林猫",
        "土耳其安哥拉猫",
        "埃及猫",
        "混种",
      ],
      dog: [
        "中华田园犬",
        "金毛寻回犬",
        "拉布拉多",
        "哈士奇",
        "萨摩耶",
        "阿拉斯加",
        "德国牧羊犬",
        "边境牧羊犬",
        "柯基",
        "柴犬",
        "泰迪",
        "比熊",
        "博美",
        "吉娃娃",
        "法斗",
        "英斗",
        "腊肠犬",
        "藏獒",
        "混种",
      ],
    };

    res.json({
      success: true,
      data: breeds[type],
    });
  } catch (error) {
    console.error("获取品种列表错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

module.exports = {
  getPets,
  getPet,
  createPet,
  updatePet,
  deletePet,
  updatePetAvatar,
  getBreeds,
};
