export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TodoModel implements Todo {
  public id: string;
  public text: string;
  public completed: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(text: string, id?: string) {
    this.id = id || this.generateId();
    this.text = text;
    this.completed = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  private generateId(): string {
    return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toggle(): void {
    this.completed = !this.completed;
    this.updatedAt = new Date();
  }

  updateText(newText: string): void {
    this.text = newText;
    this.updatedAt = new Date();
  }

  toJSON(): Todo {
    return {
      id: this.id,
      text: this.text,
      completed: this.completed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data: Todo): TodoModel {
    const todo = new TodoModel(data.text, data.id);
    todo.completed = data.completed;
    todo.createdAt = data.createdAt;
    todo.updatedAt = data.updatedAt;
    return todo;
  }
}