import React from 'react';
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  title?: string;
  description?: string;
  image?: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  showAction?: boolean;
  className?: string;
}

/**
 * @description 空状态组件，用于展示无数据状态
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description = '当前没有相关数据，请稍后再试',
  image,
  actionText = '添加数据',
  onAction,
  actionIcon = <PlusOutlined />,
  showAction = true,
  className = '',
}) => {
  const getDefaultImage = () => {
    if (image) return image;
    return Empty.PRESENTED_IMAGE_SIMPLE;
  };

  return (
    <div className={`empty-state ${className}`}>
      <Empty
        image={getDefaultImage()}
        description={
          <div className='empty-state-content'>
            <div className='empty-state-title'>{title}</div>
            <div className='empty-state-description'>{description}</div>
            {showAction && onAction && (
              <Button
                type='primary'
                icon={actionIcon}
                onClick={onAction}
                className='empty-state-action'>
                {actionText}
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
};

export default EmptyState;
