/*
 * @Author: Mael mael.liang@live.com
 * @Date: 2025-07-13 17:28:49
 * @LastEditors: Mael mael.liang@live.com
 * @LastEditTime: 2025-07-13 18:24:15
 * @FilePath: /stock-info-collector/frontend/src/components/common/StatCard.tsx
 * @Description:
 */
import React from 'react';
import { Card, Statistic, Tooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: string;
  precision?: number;
  change?: number;
  changePercent?: number;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * @description 统计卡片组件，用于展示关键指标
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  precision = 2,
  change,
  changePercent,
  loading = false,
  className = '',
  onClick,
}) => {
  const getChangeIcon = () => {
    if (!change && !changePercent) return <MinusOutlined style={{ color: '#6b7280' }} />;
    const isPositive = (change && change > 0) || (changePercent && changePercent > 0);
    return isPositive ? (
      <ArrowUpOutlined style={{ color: '#10b981' }} />
    ) : (
      <ArrowDownOutlined style={{ color: '#ef4444' }} />
    );
  };

  const getChangeColor = () => {
    if (!change && !changePercent) return '#6b7280';
    const isPositive = (change && change > 0) || (changePercent && changePercent > 0);
    return isPositive ? '#10b981' : '#ef4444';
  };

  const formatChange = () => {
    if (change !== undefined) {
      return `${change > 0 ? '+' : ''}${change.toFixed(precision)}`;
    }
    if (changePercent !== undefined) {
      return `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    }
    return null;
  };

  return (
    <Card
      className={`stat-card ${className}`}
      hoverable={!!onClick}
      onClick={onClick}
      loading={loading}>
      <div className='stat-card-content'>
        <div className='stat-card-header'>
          <span className='stat-card-title'>{title}</span>
          {(change !== undefined || changePercent !== undefined) && (
            <Tooltip title={`变化: ${formatChange()}`}>
              <div className='stat-card-change'>
                {getChangeIcon()}
                <span style={{ color: getChangeColor(), marginLeft: 4 }}>{formatChange()}</span>
              </div>
            </Tooltip>
          )}
        </div>
        <Statistic
          value={value}
          prefix={prefix}
          suffix={suffix}
          precision={0}
          valueStyle={{
            fontSize: '26px',
            fontWeight: 600,
            color: '#262626',
          }}
        />
      </div>
    </Card>
  );
};

export default StatCard;
