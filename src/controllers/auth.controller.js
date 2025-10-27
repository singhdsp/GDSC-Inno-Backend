const Team = require('../models/team.model');
const jwt = require('jsonwebtoken');

const login = async(req,res)=>{
    const { teamId, password } = req.body;
    try {
        const user = await Team.findOne({ teamId: teamId, password: password });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid teamId or password" });
        }
        const token = jwt.sign({ id: user._id, teamId: user.teamId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
        if(!token){
            return res.status(500).json({success:false, message: "Token generation failed"});
        }
        res.status(200).json({success:true, token: token , message: "Login successful" , data: { teamId: user.teamId } });

    } catch (error) {
        res.status(500).json({success:false, message: error });

    }
}

module.exports = { login };