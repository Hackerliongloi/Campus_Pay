const InstituteFund = require('../models/InstituteFund');

const getInstituteFund = async () => {
  let fund = await InstituteFund.findOne();
  if (!fund) {
    fund = await InstituteFund.create({ balance: 0 });
  }
  return fund;
};

module.exports = { getInstituteFund };
