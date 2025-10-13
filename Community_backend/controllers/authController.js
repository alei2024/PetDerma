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


// 发送验证码（模拟实现）
const sendVerificationCode = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "手机号不能为空",
      });
    }

    // 清理手机号
    const cleanPhoneNumber = phoneNumber.trim();
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(cleanPhoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "手机号格式不正确",
      });
    }

    // 模拟发送验证码（实际项目中应该调用短信服务）
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 在开发环境中，将验证码存储到内存中（实际项目中应该存储到Redis等缓存中）
    if (!global.verificationCodes) {
      global.verificationCodes = new Map();
    }
    
    // 设置验证码，5分钟过期
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟后过期
    global.verificationCodes.set(cleanPhoneNumber, {
      code: verificationCode,
      expiresAt: expiresAt,
    });

    console.log(`📱 验证码已发送到 ${cleanPhoneNumber}: ${verificationCode}`);
    console.log(`⏰ 过期时间: ${new Date(expiresAt).toLocaleString()}`);
    console.log(`📊 当前存储的验证码数量: ${global.verificationCodes.size}`);

    res.json({
      success: true,
      message: "验证码已发送",
      data: {
        // 开发环境返回验证码，生产环境不返回
        verificationCode: process.env.NODE_ENV !== "production" ? verificationCode : undefined,
      },
    });
  } catch (error) {
    console.error("发送验证码错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 验证验证码
const verifyCode = (phoneNumber, code) => {
  console.log(`🔍 验证验证码 - 手机号: ${phoneNumber}, 验证码: ${code}`);
  
  if (!global.verificationCodes) {
    console.log('❌ 验证码存储不存在');
    return false;
  }

  const stored = global.verificationCodes.get(phoneNumber);
  if (!stored) {
    console.log('❌ 未找到该手机号的验证码');
    console.log('📱 当前存储的验证码:', Array.from(global.verificationCodes.keys()));
    return false;
  }

  console.log(`📱 存储的验证码: ${stored.code}, 过期时间: ${new Date(stored.expiresAt).toLocaleString()}`);
  console.log(`⏰ 当前时间: ${new Date().toLocaleString()}`);

  // 检查是否过期
  if (Date.now() > stored.expiresAt) {
    console.log('❌ 验证码已过期');
    global.verificationCodes.delete(phoneNumber);
    return false;
  }

  // 验证码正确 - 确保都是字符串类型进行比较
  if (String(stored.code) === String(code)) {
    console.log('✅ 验证码验证成功');
    global.verificationCodes.delete(phoneNumber);
    return true;
  }

  console.log('❌ 验证码不匹配');
  return false;
};

// 用户注册
const register = async (req, res) => {
  try {
    const { phoneNumber, verificationCode, password, confirmPassword, nickName } = req.body;
    
    console.log('📝 注册请求数据:', {
      phoneNumber,
      verificationCode,
      nickName,
      passwordLength: password ? password.length : 0,
      confirmPasswordLength: confirmPassword ? confirmPassword.length : 0
    });

    // 验证必填字段
    if (!phoneNumber || !verificationCode || !password || !confirmPassword || !nickName) {
      return res.status(400).json({
        success: false,
        message: "所有字段都是必填的",
      });
    }

    // 验证手机号格式 - 先清理手机号
    const cleanPhoneNumber = phoneNumber.trim();
    if (!/^1[3-9]\d{9}$/.test(cleanPhoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "手机号格式不正确",
      });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "密码长度不能少于6位",
      });
    }

    // 验证两次密码是否一致
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "两次输入的密码不一致",
      });
    }

    // 验证验证码
    // 确保验证码是字符串类型进行比较
    const codeToVerify = String(verificationCode).trim();
    if (!verifyCode(cleanPhoneNumber, codeToVerify)) {
      return res.status(400).json({
        success: false,
        message: "验证码错误或已过期",
      });
    }

    // 检查手机号是否已注册
    const existingUser = await User.findOne({ phoneNumber: cleanPhoneNumber, status: "active" });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "该手机号已注册",
      });
    }

    // 创建新用户
    const user = new User({
      phoneNumber: cleanPhoneNumber,
      password,
      nickName,
      avatar: {
        url: "/images/user_default.png",
        source: "upload",
        key: "",
        wechatUrl: "",
      },
    });

    await user.save();

    // 生成JWT Token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "注册成功",
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
    console.error("用户注册错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 手机号密码登录
const phonePasswordLogin = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "手机号和密码不能为空",
      });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "手机号格式不正确",
      });
    }

    // 查找用户
    const user = await User.findOne({ phoneNumber, status: "active" });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "密码错误",
      });
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

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
    console.error("手机号密码登录错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 手机号登录/注册（保留原有功能）
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
  phonePasswordLogin,
  register,
  sendVerificationCode,
  getUserInfo,
  updateUserInfo,
  updateUserSettings,
  refreshToken,
  updateUserAvatar,
};
