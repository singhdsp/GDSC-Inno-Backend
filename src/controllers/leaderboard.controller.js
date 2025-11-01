const Team = require('../models/team.model');
const CacheUtil = require('../utils/cache.util');

const getLeaderboard = async (req, res) => {
    try {
        const {id} = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const team = await Team.findById(id).select('teamId levelCompleted score');
        if (!team) {
            return res.status(404).json({success: false, message: 'Team not found'});
        }
        const cachedLeaderboard = await CacheUtil.getLeaderboard(page, limit);
        if (cachedLeaderboard) {
            return res.status(200).json({
                success: true,
                message: 'Leaderboard fetched successfully (cached)',
                ...cachedLeaderboard,
                yourScore: team.score,
                yourLevelCompleted: team.levelCompleted
            });
        }
        const pipeline = [
            {
                $sort: { 
                    score: -1, 
                    teamId: 1
                }
            },
            {
                $group: {
                    _id: null,
                    teams: { $push: "$$ROOT" },
                    total: { $sum: 1 }
                }
            },
            {
                $unwind: {
                    path: "$teams",
                    includeArrayIndex: "rank"
                }
            },
            {
                $addFields: {
                    "teams.rank": { $add: ["$rank", 1] }
                }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$teams",
                            { total: "$total" }
                        ]
                    }
                }
            },
            {
                $project: {
                    teamId: 1,
                    score: 1,
                    levelCompleted: 1,
                    rank: 1,
                    total: 1
                }
            }
        ];
        
        const result = await Team.aggregate(pipeline);
        
        if (result.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
                page: page,
                pages: 0,
                yourRank: 0,
                yourScore: team.score,
                yourLevelCompleted: team.levelCompleted
            });
        }
        
        const totalTeams = result[0].total;
        const userTeam = result.find(t => t._id.toString() === id);
        const userRank = userTeam ? userTeam.rank : 0;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const leaderboard = result.slice(startIndex, endIndex).map(team => ({
            _id: team._id,
            teamId: team.teamId,
            score: team.score,
            levelCompleted: team.levelCompleted,
            rank: team.rank
        }));
        const responseData = {
            data: leaderboard,
            total: totalTeams,
            page: page,
            pages: Math.ceil(totalTeams / limit),
            yourRank: userRank,
            yourScore: team.score,
            yourLevelCompleted: team.levelCompleted
        };

        await CacheUtil.setLeaderboard(page, limit, {
            data: leaderboard,
            total: totalTeams,
            page: page,
            pages: Math.ceil(totalTeams / limit)
        });

        res.status(200).json({
            success: true,
            message: 'Leaderboard fetched successfully',
            ...responseData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching leaderboard', error: error.message });
        
    }
};

module.exports = {
    getLeaderboard
};