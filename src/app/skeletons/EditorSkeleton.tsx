import { Box, Flex, Skeleton, Text } from '@radix-ui/themes'
import React from 'react'

export function EditorSkeleton(): React.JSX.Element {
  return (
    <Box
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'white',
        borderRight: '1px solid var(--gray-6)'
      }}
      data-testid="editor-skeleton"
    >
      <Flex
        align="center"
        justify="center"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--gray-1)'
        }}
      >
        <Flex direction="column" align="center" gap="3">
          <Skeleton width="200px" height="200px" style={{ borderRadius: 'var(--radius-3)' }} />

          <Text size="3" color="gray">
            Loading editor...
          </Text>
        </Flex>
      </Flex>
    </Box>
  )
}
