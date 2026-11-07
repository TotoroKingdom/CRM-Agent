from collections.abc import Mapping


class DomainNotFoundError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InputValidationError(Exception):
    def __init__(self, fields: Mapping[str, list[str]]) -> None:
        super().__init__("输入校验失败")
        self.fields = dict(fields)
