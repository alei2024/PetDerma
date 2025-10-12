const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getWechatUserInfo } = require("../utils/wechatAuth");

const JWT_SECRET = process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456";

// 生成JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

// 微信登录
const wechatLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "缺少微信授权码",
      });
    }

    let wechatUserData;

    // 开发环境模拟微信用户数据
    if (process.env.NODE_ENV !== "production") {
      // 模拟微信用户数据
      const mockNames = [
        "微信用户",
        "宠物爱好者",
        "毛孩子家长",
        "萌宠达人",
        "爱心铲屎官",
      ];

      const randomName =
        mockNames[Math.floor(Math.random() * mockNames.length)] +
        Math.floor(Math.random() * 1000);

      wechatUserData = {
        openid: `mock_openid_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        nickname: randomName,
        avatar: {
          url: "/images/user_default.png",
          source: "wechat",
          key: "",
          wechatUrl:
            "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
        },
        gender: Math.floor(Math.random() * 3), // 0,1,2
        city: "深圳",
        province: "广东",
        country: "中国",
      };
    } else {
      // 生产环境获取真实微信用户信息
      wechatUserData = await getWechatUserInfo(code);
      if (!wechatUserData) {
        return res.status(400).json({
          success: false,
          message: "微信登录失败",
        });
      }
    }

    // 查找或创建用户
    let user = await User.findOne({
      openid: wechatUserData.openid,
      status: "active",
    });

    if (user) {
      // 更新现有用户信息
      user.nickName = wechatUserData.nickname;
      user.avatar = wechatUserData.avatar;
      user.gender = wechatUserData.gender;
      user.city = wechatUserData.city;
      user.province = wechatUserData.province;
      user.country = wechatUserData.country;
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      // 创建新用户
      user = new User({
        openid: wechatUserData.openid,
        nickName: wechatUserData.nickname,
        avatar: wechatUserData.avatar,
        gender: wechatUserData.gender,
        city: wechatUserData.city,
        province: wechatUserData.province,
        country: wechatUserData.country,
      });
      await user.save();
    }

    // 生成JWT Token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "登录成功",
      data: {
        token,
        user: {
          id: user._id,
          openid: user.openid,
          nickName: user.nickName,
          avatar: user.avatar,
          gender: user.gender,
          city: user.city,
          province: user.province,
          country: user.country,
        },
      },
    });
  } catch (error) {
    console.error("微信登录错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取用户信息
const getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-openid -unionid -__v"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("获取用户信息错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 更新用户信息
const updateUserInfo = async (req, res) => {
  try {
    const { nickname, avatar, pets } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;
    if (pets) updateData.pets = pets;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-openid -unionid -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    res.json({
      success: true,
      message: "用户信息更新成功",
      data: user,
    });
  } catch (error) {
    console.error("更新用户信息错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 更新用户设置
const updateUserSettings = async (req, res) => {
  try {
    const { privacy, notifications } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    if (privacy) updateData["settings.privacy"] = privacy;
    if (notifications) updateData["settings.notifications"] = notifications;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-openid -unionid -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    res.json({
      success: true,
      message: "设置更新成功",
      data: user.settings,
    });
  } catch (error) {
    console.error("更新用户设置错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 添加宠物
const addPet = async (req, res) => {
  try {
    const { name, species, breed, age, avatar } = req.body;
    const userId = req.user.userId;

    if (!name || !species) {
      return res.status(400).json({
        success: false,
        message: "宠物名称和种类不能为空",
      });
    }

    const petData = {
      name,
      species,
      breed: breed || "",
      age: age || 0,
      avatar: avatar || "",
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { pets: petData } },
      { new: true, runValidators: true }
    ).select("-openid -unionid -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    res.json({
      success: true,
      message: "宠物添加成功",
      data: user.pets,
    });
  } catch (error) {
    console.error("添加宠物错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 更新宠物信息
const updatePet = async (req, res) => {
  try {
    const { petId } = req.params;
    const { name, species, breed, age, avatar } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    if (name) updateData["pets.$.name"] = name;
    if (species) updateData["pets.$.species"] = species;
    if (breed !== undefined) updateData["pets.$.breed"] = breed;
    if (age !== undefined) updateData["pets.$.age"] = age;
    if (avatar !== undefined) updateData["pets.$.avatar"] = avatar;

    const user = await User.findOneAndUpdate(
      { _id: userId, "pets._id": petId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-openid -unionid -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户或宠物不存在",
      });
    }

    res.json({
      success: true,
      message: "宠物信息更新成功",
      data: user.pets,
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
    const { petId } = req.params;
    const userId = req.user.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { pets: { _id: petId } } },
      { new: true, runValidators: true }
    ).select("-openid -unionid -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    res.json({
      success: true,
      message: "宠物删除成功",
      data: user.pets,
    });
  } catch (error) {
    console.error("删除宠物错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 手机号登录/注册
const phoneLogin = async (req, res) => {
  try {
    const { phoneNumber, nickName, avatar } = req.body;

    if (!phoneNumber || !nickName) {
      return res.status(400).json({
        success: false,
        message: "手机号和昵称不能为空",
      });
    }

    // 查找或创建用户
    let user = await User.findOne({ phoneNumber, status: "active" });

    if (user) {
      // 更新现有用户信息
      user.nickName = nickName;
      if (avatar) {
        // 如果avatar包含imageId，说明是新上传的头像
        if (avatar.imageId) {
          user.avatar = {
            url: avatar.url,
            source: "upload",
            key: avatar.key || avatar.imageId.toString(),
            wechatUrl: "",
            imageId: avatar.imageId,
          };
        } else {
          // 兼容旧格式，只提取需要的字段
          user.avatar = {
            url: avatar.url || "/images/user_default.png",
            source: avatar.source || "upload",
            key: avatar.key || "",
            wechatUrl: avatar.wechatUrl || "",
            imageId: avatar.imageId || null,
          };
        }
      }
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      // 创建新用户
      const defaultAvatar =
        avatar && avatar.imageId
          ? {
              url: avatar.url,
              source: "upload",
              key: avatar.key || avatar.imageId.toString(),
              wechatUrl: "",
              imageId: avatar.imageId,
            }
          : {
              url: "/images/user_default.png",
              source: "upload",
              key: "",
              wechatUrl: "",
            };

      user = new User({
        phoneNumber,
        nickName,
        avatar: defaultAvatar,
      });
      await user.save();
    }

    // 生成JWT Token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "登录成功",
      data: {
        token,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          nickName: user.nickName,
          avatar: user.avatar,
          gender: user.gender,
          city: user.city,
          province: user.province,
          country: user.country,
        },
      },
    });
  } catch (error) {
    console.error("手机号登录错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 刷新Token
const refreshToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    const token = generateToken(userId);

    res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error("刷新Token错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 更新用户头像
const updateUserAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: "头像数据不能为空",
      });
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 更新用户头像，只提取需要的字段
    const cleanAvatar = {
      url: avatar.url,
      source: avatar.source || "upload",
      key: avatar.key || (avatar.imageId ? avatar.imageId.toString() : ""),
      wechatUrl: avatar.wechatUrl || "",
      imageId: avatar.imageId || null,
    };

    user.avatar = cleanAvatar;
    await user.save();

    res.json({
      success: true,
      message: "头像更新成功",
      data: {
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("更新用户头像错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

module.exports = {
  wechatLogin,
  phoneLogin,
  getUserInfo,
  updateUserInfo,
  updateUserSettings,
  addPet,
  updatePet,
  deletePet,
  refreshToken,
  updateUserAvatar,
};
