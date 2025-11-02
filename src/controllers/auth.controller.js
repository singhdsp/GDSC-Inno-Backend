const Team = require('../models/team.model');
const jwt = require('jsonwebtoken');
const CacheUtil = require('../utils/cache.util');

const login = async(req,res)=>{
    const { teamId, password } = req.body;
    try {
        const user = await Team.findOne({ teamId: teamId, password: password });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid teamId or password" });
        }
        const now = new Date();
        const gameTimeInHours = parseInt(process.env.GAME_TIME_HOURS) || 2;
        const gameTimeInMs = gameTimeInHours * 60 * 60 * 1000;
        const tokenValidityHours = parseInt(process.env.TOKEN_VALIDITY_HOURS) || 24;
        let firstLoginTime = user.loginAt;

        if (!firstLoginTime) {
            user.loginAt = now;
            firstLoginTime = now;
            user.isActive = true;
            await user.save();
        }

        const timeSinceFirstLogin = now - new Date(firstLoginTime);
        const gameTimeRemaining = gameTimeInMs - timeSinceFirstLogin;
        const isGameActive = gameTimeRemaining > 0;
        const token = jwt.sign(
            { 
                id: user._id, 
                teamId: user.teamId,
                firstLoginTime: firstLoginTime.toISOString()
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: `${tokenValidityHours}h` }
        );
        
        if(!token){
            return res.status(500).json({success:false, message: "Token generation failed"});
        }
        const teamData = {
            _id: user._id,
            teamId: user.teamId,
            score: user.score,
            levelCompleted: user.levelCompleted,
            isActive: user.isActive,
            loginAt: user.loginAt
        };
        await CacheUtil.setTeam(user._id.toString(), teamData);
        res.status(200).json({
            success:true, 
            token: token, 
            message: "Login successful",
            data: { 
                teamId: user.teamId,
                isGameActive: isGameActive,
                gameTimeRemaining: isGameActive ? Math.floor(gameTimeRemaining / 1000) : 0,
                gameExpiresAt: new Date(new Date(firstLoginTime).getTime() + gameTimeInMs).toISOString()
            }
        });

    } catch (error) {
        res.status(500).json({success:false, message: error.message });
    }
}

const currentSession = async(req,res)=>{
    try {
        const { id } = req.user;
        let team = await CacheUtil.getTeam(id);
        if (!team) {
            team = await Team.findById(id).select('-password').lean();
            if (!team) {
                return res.status(404).json({ success: false, message: 'Team not found' });
            }
            await CacheUtil.setTeam(id, team);
        }
        const now = new Date();
        const firstLoginTime = new Date(team.loginAt);
        const timeSinceLogin = now - firstLoginTime;
        const gameTimeInHours = parseInt(process.env.GAME_TIME_HOURS) || 2;
        const gameTimeInMs = gameTimeInHours * 60 * 60 * 1000;
        const gameTimeRemaining = gameTimeInMs - timeSinceLogin;
        const isGameActive = gameTimeRemaining > 0;
        
        res.status(200).json({ 
            success: true, 
            data: {
                ...team,
                isGameActive: isGameActive,
                gameTimeRemaining: isGameActive ? Math.floor(gameTimeRemaining / 1000) : 0,
                gameExpiresAt: new Date(firstLoginTime.getTime() + gameTimeInMs).toISOString()
            }, 
            message: 'Team session fetched successfully' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching team', error: error.message });
    }
}

module.exports = { login , currentSession };