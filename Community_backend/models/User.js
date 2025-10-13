const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // 微信用户和手机号用户二选一
    openid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    password: {
      type: String,
      required: function() {
        return this.phoneNumber && !this.openid;
      },
    },

    // 用户基本信息
    nickName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    // 统一的头像存储方案
    avatar: {
      url: {
        type: String,
        required: true,
      },
      source: {
        type: String,
        required: true,
        enum: ["wechat", "upload"],
      },
      key: {
        type: String,
        default: "",
      },
      wechatUrl: {
        type: String,
        default: "",
      },
      // 新增：Image模型的ObjectId（用于二进制存储）
      imageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
      },
    },
    gender: {
      type: Number,
      enum: [0, 1, 2], // 0-未知，1-男，2-女
      default: 0,
    },
    city: {
      type: String,
      default: "",
    },
    province: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },

    // 用户状态
    status: {
      type: String,
      enum: ["active", "banned", "deleted"],
      default: "active",
    },

    // 宠物信息
    pets: [
      {
        name: {
          type: String,
          required: true,
        },
        species: {
          type: String,
          required: true,
        },
        breed: {
          type: String,
          default: "",
        },
        age: {
          type: Number,
          default: 0,
        },
        avatar: {
          type: String,
          default: "",
        },
      },
    ],

    // 用户设置
    settings: {
      privacy: {
        type: Object,
        default: {},
      },
      notifications: {
        type: Object,
        default: {},
      },
    },

    // 时间戳
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
userSchema.index({ openid: 1 });
userSchema.index({ nickname: "text" });
userSchema.index({ status: 1 });

// 虚拟字段：用户ID（用于前端显示）
userSchema.virtual("userId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// 密码加密中间件
userSchema.pre('save', async function(next) {
  // 只有密码被修改时才加密
  if (!this.isModified('password')) return next();
  
  try {
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 静态方法：根据openid查找用户
userSchema.statics.findByOpenid = function (openid) {
  return this.findOne({ openid, status: "active" });
};

// 静态方法：创建或更新用户
userSchema.statics.createOrUpdate = async function (wechatUserData) {
  const { openid, unionid, nickname, avatar, gender, city, province, country } =
    wechatUserData;

  let user = await this.findByOpenid(openid);

  if (user) {
    // 更新现有用户信息
    user.nickname = nickname;
    user.avatar = avatar;
    user.gender = gender;
    user.city = city;
    user.province = province;
    user.country = country;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    // 创建新用户
    user = new this({
      openid,
      unionid,
      nickname,
      avatar,
      gender,
      city,
      province,
      country,
    });
    await user.save();
  }

  return user;
};

module.exports = mongoose.model("User", userSchema);
