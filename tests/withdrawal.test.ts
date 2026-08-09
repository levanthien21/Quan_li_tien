import Decimal from 'decimal.js';
import { WithdrawalService, IWithdrawalRepository, InsufficientBalanceError } from '../src/services/withdrawal.service.js';
import { FeeRateService, IFeeRateRepository } from '../src/services/fee-rate.service.js';
import { BalanceService, IBalanceRepository } from '../src/services/balance.service.js';
import { WithdrawalCalculationService } from '../src/services/withdrawal-calc.service.js';

describe('WithdrawalService Tests (Required Test Cases 5 & 6)', () => {
  let withdrawalService: WithdrawalService;
  let mockFeeRepo: jest.Mocked<IFeeRateRepository>;
  let mockBalanceRepo: jest.Mocked<IBalanceRepository>;
  let mockWithdrawRepo: jest.Mocked<IWithdrawalRepository>;

  const groupId = BigInt(1001);
  const customerId = BigInt(2002);
  const operatorId = BigInt(3003);

  beforeEach(() => {
    mockFeeRepo = {
      getCustomerFee: jest.fn().mockResolvedValue(null),
      getGroupDefaultFee: jest.fn().mockResolvedValue(new Decimal(5)),
      getGroupDepositRate: jest.fn().mockResolvedValue(new Decimal(26859)),
      getGroupWithdrawalRate: jest.fn().mockResolvedValue(new Decimal(26309)),
    };

    mockBalanceRepo = {
      getNetDepositUsdtSum: jest.fn().mockResolvedValue(new Decimal('1301.61')),
      getWithdrawalUsdtSum: jest.fn().mockResolvedValue(new Decimal(0)),
      getAdjustmentUsdtSum: jest.fn().mockResolvedValue(new Decimal(0)),
    };

    mockWithdrawRepo = {
      createWithdrawalTransaction: jest.fn().mockImplementation(() =>
        Promise.resolve({ id: 'tx-w-1', createdAt: new Date() })
      ),
      getCustomerName: jest.fn().mockResolvedValue('Nguyễn Văn A'),
    };

    const feeRateService = new FeeRateService(mockFeeRepo);
    const balanceService = new BalanceService(mockBalanceRepo);
    const calcService = new WithdrawalCalculationService();

    withdrawalService = new WithdrawalService(
      mockWithdrawRepo,
      balanceService,
      feeRateService,
      calcService
    );
  });

  test('Case 5: Balance = 1,301.61 U, Withdrawal = 1,298 U -> Remaining = 3.61 U', async () => {
    const result = await withdrawalService.processWithdrawal({
      groupId,
      customerId,
      operatorId,
      amountUsdt: new Decimal(1298),
    });

    expect(result.previousBalanceUsdt.toFixed(2)).toBe('1301.61');
    expect(result.withdrawUsdt.toFixed(2)).toBe('1298.00');
    expect(result.remainingBalanceUsdt.toFixed(2)).toBe('3.61');

    expect(mockWithdrawRepo.createWithdrawalTransaction).toHaveBeenCalledWith({
      groupId,
      customerId,
      operatorId,
      exchangeRate: new Decimal(26309),
      amountUsdt: new Decimal(1298),
      telegramMessageId: undefined,
      note: undefined,
    });
  });

  test('Case 6: Withdrawal > Balance (1400 U > 1301.61 U) -> Rejects transaction', async () => {
    await expect(
      withdrawalService.processWithdrawal({
        groupId,
        customerId,
        operatorId,
        amountUsdt: new Decimal(1400),
      })
    ).rejects.toThrow(InsufficientBalanceError);

    // Transaction should NOT be written to database if rejected
    expect(mockWithdrawRepo.createWithdrawalTransaction).not.toHaveBeenCalled();
  });
});
