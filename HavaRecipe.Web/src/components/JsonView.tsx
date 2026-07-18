import { Code } from '@mantine/core'

export function JsonView({ data }: { data: unknown }) {
  return (
    <Code block style={{ maxHeight: 500, overflow: 'auto' }}>
      {JSON.stringify(data, null, 2)}
    </Code>
  )
}
