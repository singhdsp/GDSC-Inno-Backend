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

const currentSession = async(req,res)=>{
    try {
        const { id } = req.user;
        const team = await Team.findById(id).select('-password');
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }
        res.status(200).json({ success: true, data: team, message: 'Team fetched successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching team', error: error.message });
    }
}

module.exports = { login , currentSession };