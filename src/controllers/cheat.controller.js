const Cheat = require('../models/cheat.model');

const reportCheat = async (req, res) => {
    try {
        const { id } = req.user;
        const cheat = await Cheat.create({ teamId: id });
        if (!cheat) {
            return res.status(500).json({
                success: false,
                message: 'Failed to report cheat'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Cheat reported successfully',
            data: cheat
        });
        
    } catch (error) {
        console.error('Error reporting cheat:', error);
        res.status(500).json({
            success: false,
            message: 'Error reporting cheat',
            error: error.message
        });   
    }
};

module.exports = {
    reportCheat
};