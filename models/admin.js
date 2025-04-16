const mongoose = require("mongoose");
const bcrypt = require('bcrypt')
// const jwt = require('jsonwebtoken')

// const {isEmail} = require('validator')
const adminSchema = new mongoose.Schema(
  {
    name: {
        type: String,
        default: 'Admin'
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
    //   validate: [isEmail, 'please enter a valid email']
    },
    password: {
      type: String,
      required: [true,'Please enter a password'],
    //   minlength: [6,'your password should be more than 6 characters']
    },
    image:{
      type: String,
    }
  },
  { timestamps: true }
);


// fire a function after a user has been  saved
adminSchema.post('save',function(doc,next){
  console.log('new user was saved')
  next()
})

// fire a function before a user has been  saved
adminSchema.pre('save',async function(next){
  console.log('admin is about to be saved', this)
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password,salt)
  next()
})

// lets verify the isAdmin with the static mathod
adminSchema.statics.login = async function(email, password){
  const admin = await this.findOne({email})
  if(!admin){
    throw Error('incorrect Email')
  }
  else{
    const auth = await bcrypt.compare(password, admin.password)
    if(auth){
      // personal code cause of reactjs

      // creating a token after signing up
      // const accessToken = jwt.sign(
      //   { 
      //     "admInIfo": {
      //       "adminId": admin._id,
      //       "adminName": admin.name,
      //       "adminEmail": admin.email
      //     }
      //   },
      //   'AriTron cbt software.cbt',
      //   { expiresIn: 24*60*60 }
      // ) ;
      // console.log(admin)
      return admin
      // return ({admin})
    }else{
      throw Error('incorrect Password')
    }
  }
}


const adminModel = mongoose.model("admine", adminSchema);

module.exports = adminModel;
