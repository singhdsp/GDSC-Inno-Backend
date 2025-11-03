const Team = require('../models/team.model');
const LevelProgress = require('../models/levelProgress.model');
const CacheUtil = require('../utils/cache.util');

const getLeaderboard = async (req, res) => {
    try {
        const {id} = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const team = await Team.findById(id).select('teamId levelCompleted score loginAt');
        if (!team) {
            return res.status(404).json({success: false, message: 'Team not found'});
        }

        const latestProgress = await LevelProgress.findOne({teamId: id})
            .sort({completedAt: -1})
            .select('completedAt')
            .lean();
        
        const timeTaken = latestProgress?.completedAt 
            ? new Date(latestProgress.completedAt).getTime() - new Date(team.loginAt).getTime()
            : new Date().getTime() - new Date(team.loginAt).getTime();
        
        const cachedLeaderboard = await CacheUtil.getLeaderboard(page, limit);
        if (cachedLeaderboard) {
            const userRankPipeline = [
                { $match: { isActive: true } },
                { $sort: { score: -1, teamId: 1 } },
                { $group: { _id: null, teams: { $push: '$_id' } } },
                { $unwind: { path: '$teams', includeArrayIndex: 'rank' } },
                { $match: { teams: team._id } },
                { $project: { rank: { $add: ['$rank', 1] } } }
            ];
            const userRankResult = await Team.aggregate(userRankPipeline);
            const yourRank = userRankResult.length > 0 ? userRankResult[0].rank : 0;
            
            return res.status(200).json({
                success: true,
                message: 'Leaderboard fetched successfully (cached)',
                ...cachedLeaderboard,
                yourRank: yourRank,
                yourScore: team.score,
                yourLevelCompleted: team.levelCompleted,
                yourTimeTaken: timeTaken
            });
        }
        const pipeline = [
            {
                $match: { isActive: true }
            },
            {
                $lookup: {
                    from: 'levelprogresses',
                    let: { teamId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$teamId', '$$teamId'] }
                            }
                        },
                        {
                            $sort: { completedAt: -1 }
                        },
                        {
                            $limit: 1
                        },
                        {
                            $project: { completedAt: 1 }
                        }
                    ],
                    as: 'latestProgress'
                }
            },
            {
                $addFields: {
                    timeTaken: {
                        $cond: {
                            if: { $gt: [{ $size: '$latestProgress' }, 0] },
                            then: {
                                $subtract: [
                                    { $arrayElemAt: ['$latestProgress.completedAt', 0] },
                                    '$loginAt'
                                ]
                            },
                            else: {
                                $subtract: [new Date(), '$loginAt']
                            }
                        }
                    }
                }
            },
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
                    total: 1,
                    timeTaken: 1
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
                yourLevelCompleted: team.levelCompleted,
                yourTimeTaken: timeTaken
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
            rank: team.rank,
            timeTaken: team.timeTaken || 0
        }));
        const responseData = {
            data: leaderboard,
            total: totalTeams,
            page: page,
            pages: Math.ceil(totalTeams / limit),
            yourRank: userRank,
            yourScore: team.score,
            yourLevelCompleted: team.levelCompleted,
            yourTimeTaken: timeTaken
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