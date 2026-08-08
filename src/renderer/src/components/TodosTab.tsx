import { useState } from 'react'
import { Trash2, Plus, ListTodo } from 'lucide-react'
import { useStore } from '../store'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { translate } from '../lib/i18n'

export function TodosTab(): React.JSX.Element {
  const todos = useStore((s) => s.todos)
  const saveTodos = useStore((s) => s.saveTodos)
  const uiLanguage = useStore((s) => s.settings.uiLanguage)
  const [text, setText] = useState('')

  const sorted = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const add = async (): Promise<void> => {
    if (!text.trim()) return
    const nextId = Math.max(...todos.map((t) => t.id), 0) + 1
    await saveTodos([
      ...todos,
      {
        id: nextId,
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
      }
    ])
    setText('')
  }

  const toggle = async (id: number): Promise<void> => {
    await saveTodos(
      todos.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: t.completed ? null : new Date().toISOString()
            }
          : t
      )
    )
  }

  const remove = async (id: number): Promise<void> => {
    await saveTodos(todos.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {translate(uiLanguage, 'tasksTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {translate(uiLanguage, 'tasksSubtitle')}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={translate(uiLanguage, 'taskPlaceholder')}
          value={text}
          maxLength={100}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add()
          }}
        />
        <Button onClick={() => void add()}>
          <Plus className="h-4 w-4" /> {translate(uiLanguage, 'add')}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ListTodo className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold">
              {translate(uiLanguage, 'noTasksTitle')}
            </h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              {translate(uiLanguage, 'noTasksDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((todo) => (
            <Card key={todo.id} className={todo.completed ? 'opacity-60' : ''}>
              <CardContent className="flex items-center gap-3 p-4">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => void toggle(todo.id)}
                />
                <span
                  className={
                    todo.completed
                      ? 'flex-1 text-muted-foreground line-through'
                      : 'flex-1'
                  }
                >
                  {todo.text}
                </span>
                <Button variant="ghost" size="icon" onClick={() => void remove(todo.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
