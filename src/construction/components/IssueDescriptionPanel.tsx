import { CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Text } from '@radix-ui/themes'
import { use } from 'react'

import type { ConstructionModel } from '@/construction/model'

interface IssueDescriptionPanelProps {
  modelPromise: Promise<ConstructionModel | null>
}

export const IssueDescriptionPanel = ({ modelPromise }: IssueDescriptionPanelProps) => {
  const model = use(modelPromise)

  return (
    <Box className="border-t border-gray-6">
      <Flex direction="column" gap="2" p="3" style={{ maxHeight: '120px', overflowY: 'auto' }}>
        {model ? (
          <>
            {model.errors.length > 0 && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <CrossCircledIcon />
                </Callout.Icon>
                <Flex direction="column" gap="2">
                  <Text weight="medium" size="2">
                    Errors ({model.errors.length})
                  </Text>
                  <Flex direction="column" gap="1">
                    {model.errors.map((error, index) => (
                      <Text key={index} size="1">
                        • {error.description}
                      </Text>
                    ))}
                  </Flex>
                </Flex>
              </Callout.Root>
            )}

            {model.warnings.length > 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Flex direction="column" gap="2">
                  <Text weight="medium" size="2">
                    Warnings ({model.warnings.length})
                  </Text>
                  <Flex direction="column" gap="1">
                    {model.warnings.map((warning, index) => (
                      <Text key={index} size="1">
                        • {warning.description}
                      </Text>
                    ))}
                  </Flex>
                </Flex>
              </Callout.Root>
            )}

            {model.errors.length === 0 && model.warnings.length === 0 && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Flex direction="column" gap="1">
                  <Text weight="medium" size="2">
                    No Issues Found
                  </Text>
                  <Text size="1">Construction plan is valid with no errors or warnings.</Text>
                </Flex>
              </Callout.Root>
            )}
          </>
        ) : (
          <Callout.Root color="red" size="1">
            <Callout.Icon>
              <CrossCircledIcon />
            </Callout.Icon>
            <Callout.Text>Failed to generate construction model</Callout.Text>
          </Callout.Root>
        )}
      </Flex>
    </Box>
  )
}
