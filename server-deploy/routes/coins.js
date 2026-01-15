// 寓言币相关路由
const express = require('express');
const router = express.Router();

const {
  findUserByOpenid,
  consumeCoins,
  getCoinTransactions
} = require('../database');

/**
 * 查询寓言币余额
 * GET /api/coins/balance?openid=xxx
 */
router.get('/balance', (req, res) => {
  console.log('[API] 查询寓言币余额');
  
  try {
    const { openid } = req.query;
    
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '缺少 openid 参数'
      });
    }
    
    const user = findUserByOpenid(openid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        balance: user.coins,
        is_first_charge: user.is_first_charge === 1
      }
    });
    
  } catch (error) {
    console.error('[API] 查询余额错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 消费寓言币
 * POST /api/coins/consume
 * 
 * Body:
 * - openid: 用户 openid
 * - amount: 消费数量（默认 1）
 * - description: 消费描述（如：单品建议、穿搭优化）
 */
router.post('/consume', (req, res) => {
  console.log('[API] 消费寓言币');
  
  try {
    const { openid, amount = 1, description = '功能消费' } = req.body;
    
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '缺少 openid 参数'
      });
    }
    
    // 执行消费
    const result = consumeCoins(openid, amount, description);
    
    if (!result.success) {
      // 余额不足或其他错误
      return res.status(400).json({
        success: false,
        code: result.code,
        message: result.message,
        data: {
          balance: result.balance || 0
        }
      });
    }
    
    // 消费成功
    res.json({
      success: true,
      data: {
        consumed: result.consumed,
        balance: result.balance,
        message: result.message
      }
    });
    
  } catch (error) {
    console.error('[API] 消费寓言币错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 查询消费记录
 * GET /api/coins/transactions?openid=xxx&limit=20
 */
router.get('/transactions', (req, res) => {
  console.log('[API] 查询消费记录');
  
  try {
    const { openid, limit = 20 } = req.query;
    
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '缺少 openid 参数'
      });
    }
    
    const transactions = getCoinTransactions(openid, parseInt(limit));
    
    // 格式化输出
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      type: t.type,
      type_name: getTypeName(t.type),
      amount: t.amount,
      balance_after: t.balance_after,
      description: t.description,
      created_at: t.created_at
    }));
    
    res.json({
      success: true,
      data: formattedTransactions
    });
    
  } catch (error) {
    console.error('[API] 查询消费记录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取类型名称
function getTypeName(type) {
  const typeNames = {
    'initial': '注册赠送',
    'consume': '功能消费',
    'recharge': '充值',
    'first_bonus': '首充奖励',
    'invite_reward': '邀请奖励',
    'invited_reward': '受邀奖励'
  };
  return typeNames[type] || type;
}

module.exports = router;

